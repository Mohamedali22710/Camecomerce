#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Export a public Salla storefront catalog to a structured Markdown file.

Default target: https://silken.sa
Output: silken_catalog.md

This script reads public catalog data only. It does not log in, add products to
cart, submit forms, or access customer/order information.
"""

from __future__ import annotations

import argparse
import html
import json
import logging
import re
import time
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Iterable
from urllib.parse import parse_qs, urljoin, urlparse, urldefrag
import xml.etree.ElementTree as ET

import requests
from bs4 import BeautifulSoup

DEFAULT_STORE = "https://silken.sa"
API_BASE = "https://api.salla.dev/store/v1"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 "
    "CatalogExporter/1.0"
)
DETAIL_FIELDS = [
    "images", "category", "rating", "notify_availability", "tags", "brand",
    "options", "skus", "skus_availability", "included_products", "bundle",
    "sold_quantity",
]

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
LOG = logging.getLogger("salla-exporter")


def as_list(value: Any) -> list:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, dict):
        # Some APIs return a collection under one of these keys.
        for key in ("items", "data", "results"):
            if isinstance(value.get(key), list):
                return value[key]
    return []


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, dict):
        for key in ("name", "label", "title", "value", "text"):
            if value.get(key) not in (None, ""):
                return clean_text(value[key])
        return ""
    if isinstance(value, list):
        return ", ".join(filter(None, (clean_text(x) for x in value)))
    return re.sub(r"\s+", " ", html.unescape(str(value))).strip()


def html_to_markdown(value: Any) -> str:
    """Convert common product-description HTML into readable Markdown."""
    if not value:
        return ""
    if not isinstance(value, str):
        return clean_text(value)

    soup = BeautifulSoup(value, "html.parser")
    for unwanted in soup(["script", "style", "noscript", "iframe"]):
        unwanted.decompose()

    # Convert links/images before extracting text.
    for image in soup.find_all("img"):
        src = image.get("src") or image.get("data-src") or image.get("data-original")
        alt = clean_text(image.get("alt")) or "صورة"
        image.replace_with(f"![{alt}]({src})" if src else alt)

    for anchor in soup.find_all("a"):
        label = anchor.get_text(" ", strip=True) or anchor.get("href", "رابط")
        href = anchor.get("href")
        anchor.replace_with(f"[{label}]({href})" if href else label)

    for tag in soup.find_all(["strong", "b"]):
        tag.replace_with(f"**{tag.get_text(' ', strip=True)}**")
    for tag in soup.find_all(["em", "i"]):
        tag.replace_with(f"*{tag.get_text(' ', strip=True)}*")
    for tag in soup.find_all(["h1", "h2", "h3", "h4"]):
        level = int(tag.name[1])
        tag.insert_before("\n" + ("#" * level) + " ")
        tag.insert_after("\n\n")
    for tag in soup.find_all("li"):
        tag.insert_before("\n- ")
        tag.insert_after("\n")
    for tag in soup.find_all(["p", "div", "section", "article", "tr"]):
        tag.insert_before("\n")
        tag.insert_after("\n")
    for tag in soup.find_all("br"):
        tag.replace_with("\n")
    for cell in soup.find_all(["td", "th"]):
        cell.insert_after(" | ")

    text = soup.get_text("", strip=False)
    text = html.unescape(text).replace("\xa0", " ")
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.splitlines()]
    # Collapse excess blank lines without flattening paragraphs/lists.
    output: list[str] = []
    blank = False
    for line in lines:
        if not line:
            if output and not blank:
                output.append("")
            blank = True
        else:
            output.append(line)
            blank = False
    return "\n".join(output).strip()


def walk_categories(categories: Iterable[dict], parent_path: str = "") -> list[dict]:
    flattened: list[dict] = []
    for category in categories:
        if not isinstance(category, dict):
            continue
        name = clean_text(category.get("name")) or "قسم بدون اسم"
        path = f"{parent_path} / {name}" if parent_path else name
        row = dict(category)
        row["_path"] = path
        flattened.append(row)
        children = as_list(category.get("sub_categories"))
        flattened.extend(walk_categories(children, path))
    return flattened


def image_urls(product: dict) -> list[tuple[str, str]]:
    found: list[tuple[str, str]] = []

    def add(candidate: Any, default_alt: str = "") -> None:
        if isinstance(candidate, str):
            url, alt = candidate, default_alt
        elif isinstance(candidate, dict):
            url = ""
            for key in ("url", "original", "original_url", "full_url", "src", "main"):
                val = candidate.get(key)
                if isinstance(val, str) and val.startswith(("http://", "https://")):
                    url = val
                    break
            alt = clean_text(candidate.get("alt") or candidate.get("alt_text") or default_alt)
        else:
            return
        if url.startswith(("http://", "https://")) and all(existing[0] != url for existing in found):
            found.append((url, alt or default_alt or "صورة المنتج"))

    add(product.get("image"), clean_text(product.get("name")))
    for entry in as_list(product.get("images")):
        add(entry, clean_text(product.get("name")))
    return found


def product_identifier(product: dict) -> str:
    value = product.get("id") or product.get("product_id")
    return str(value).strip() if value is not None else ""


def get_nested_name(value: Any) -> str:
    if isinstance(value, dict):
        return clean_text(value.get("name") or value.get("title") or value.get("label"))
    return clean_text(value)


class SallaExporter:
    def __init__(self, store_url: str, delay: float = 0.45, timeout: int = 25):
        self.store_url = store_url.rstrip("/")
        parsed = urlparse(self.store_url)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            raise ValueError("رابط المتجر غير صحيح. استخدم رابطًا يبدأ بـ https://")
        self.host = parsed.netloc.lower()
        self.delay = max(0.0, delay)
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": USER_AGENT,
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "ar,en;q=0.8",
            "store-identifier": self.host,
            "Origin": self.store_url,
            "Referer": self.store_url + "/",
        })
        self.last_request = 0.0

    def _throttle(self) -> None:
        elapsed = time.monotonic() - self.last_request
        if elapsed < self.delay:
            time.sleep(self.delay - elapsed)

    def request(self, url: str, *, params: Any = None, json_expected: bool = True) -> Any:
        last_error: Exception | None = None
        for attempt in range(4):
            self._throttle()
            try:
                response = self.session.get(url, params=params, timeout=self.timeout)
                self.last_request = time.monotonic()
                if response.status_code == 429 or response.status_code >= 500:
                    if attempt < 3:
                        wait = min(2 ** attempt, 8)
                        LOG.warning("استجابة %s؛ إعادة المحاولة بعد %s ثوانٍ", response.status_code, wait)
                        time.sleep(wait)
                        continue
                response.raise_for_status()
                if json_expected:
                    data = response.json()
                    if isinstance(data, dict) and data.get("success") is False:
                        raise RuntimeError(clean_text(data.get("message") or data.get("error")) or "API returned success=false")
                    return data
                return response.text
            except (requests.RequestException, ValueError, RuntimeError) as exc:
                last_error = exc
                if attempt < 3 and isinstance(exc, requests.RequestException):
                    time.sleep(min(2 ** attempt, 8))
                    continue
                break
        raise RuntimeError(f"تعذر تحميل {url}: {last_error}")

    def api(self, path: str, params: Any = None) -> dict:
        url = f"{API_BASE}/{path.lstrip('/')}"
        result = self.request(url, params=params, json_expected=True)
        if not isinstance(result, dict):
            raise RuntimeError(f"استجابة API غير متوقعة من {url}")
        return result

    def get_categories(self) -> list[dict]:
        payload = self.api("categories")
        return walk_categories(as_list(payload.get("data")))

    def get_product_pages(self, source: str, source_value: str | None = None, per_page: int = 50) -> list[dict]:
        """Get every page using Salla's cursor returned by the public API."""
        results: list[dict] = []
        seen_ids: set[str] = set()
        cursor: str | None = None
        seen_cursors: set[str] = set()

        for _page_number in range(1, 1001):
            params: list[tuple[str, str]] = [
                ("source", source), ("per_page", str(per_page)),
            ]
            if source_value is not None:
                params.append(("source_value[]", str(source_value)))
            if cursor:
                params.append(("cursor", cursor))

            payload = self.api("products", params=params)
            batch = as_list(payload.get("data"))
            new_count = 0
            for item in batch:
                if not isinstance(item, dict):
                    continue
                pid = product_identifier(item)
                if not pid or pid in seen_ids:
                    continue
                seen_ids.add(pid)
                results.append(item)
                new_count += 1

            # The Store API returns cursor metadata; its `next` value is a URL.
            # The next request needs the cursor query parameter, not the whole URL.
            page_meta = payload.get("cursor") or payload.get("pagination") or {}
            next_value = page_meta.get("next") if isinstance(page_meta, dict) else None
            if not next_value:
                break
            if isinstance(next_value, str) and next_value.startswith(("http://", "https://")):
                query = parse_qs(urlparse(next_value).query)
                cursor_values = query.get("cursor") or []
                next_cursor = cursor_values[0] if cursor_values else None
            else:
                next_cursor = str(next_value)
            if not next_cursor or next_cursor in seen_cursors or new_count == 0:
                break
            seen_cursors.add(next_cursor)
            cursor = next_cursor
        return results

    def get_product_details(self, product_id: str) -> dict | None:
        params = [("with[]", field) for field in DETAIL_FIELDS]
        try:
            payload = self.api(f"products/{product_id}/details", params=params)
            data = payload.get("data")
            return data if isinstance(data, dict) else None
        except Exception as exc:
            LOG.warning("تعذر جلب التفاصيل الكاملة للمنتج %s: %s", product_id, exc)
            return None

    def html_fallback(self, url: str) -> dict:
        """Light fallback for stores/API fields blocked by the public API."""
        page = self.request(url, json_expected=False)
        soup = BeautifulSoup(page, "html.parser")
        result: dict[str, Any] = {}
        title = soup.find("meta", attrs={"property": "og:title"})
        desc = soup.find("meta", attrs={"property": "og:description"})
        image = soup.find("meta", attrs={"property": "og:image"})
        if title:
            result["name"] = title.get("content", "")
        if desc:
            result["description"] = desc.get("content", "")
        if image:
            result["images"] = [{"url": image.get("content", "")}]

        for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
            try:
                parsed = json.loads(script.string or script.get_text())
            except (TypeError, ValueError):
                continue
            objects = parsed if isinstance(parsed, list) else [parsed]
            for obj in objects:
                if isinstance(obj, dict) and obj.get("@type") == "Product":
                    result.setdefault("name", obj.get("name"))
                    result.setdefault("description", obj.get("description"))
                    result.setdefault("sku", obj.get("sku"))
                    result.setdefault("brand", obj.get("brand"))
                    if obj.get("image"):
                        imgs = obj["image"] if isinstance(obj["image"], list) else [obj["image"]]
                        result["images"] = [{"url": x} if isinstance(x, str) else x for x in imgs]
                    offers = obj.get("offers") or {}
                    if isinstance(offers, list):
                        offers = offers[0] if offers else {}
                    if isinstance(offers, dict):
                        result.setdefault("price", offers.get("price"))
                        result.setdefault("currency", offers.get("priceCurrency"))
        result["url"] = url
        return result

    def sitemap_urls(self) -> list[str]:
        """Read robots.txt sitemap declarations and common Salla sitemap paths."""
        queue = [
            self.store_url + "/sitemap.xml",
            self.store_url + "/ar/sitemap.xml",
        ]
        robots_url = self.store_url + "/robots.txt"
        try:
            robots = self.request(robots_url, json_expected=False)
            for line in robots.splitlines():
                if line.lower().startswith("sitemap:"):
                    queue.insert(0, line.split(":", 1)[1].strip())
        except Exception:
            pass

        visited_maps: set[str] = set()
        page_urls: list[str] = []
        while queue and len(visited_maps) < 100:
            sitemap = queue.pop(0)
            if sitemap in visited_maps:
                continue
            visited_maps.add(sitemap)
            try:
                xml_text = self.request(sitemap, json_expected=False)
                root = ET.fromstring(xml_text)
            except Exception as exc:
                LOG.debug("تعذر قراءة sitemap %s: %s", sitemap, exc)
                continue
            for element in root.iter():
                tag = element.tag.rsplit("}", 1)[-1].lower()
                if tag != "loc" or not element.text:
                    continue
                loc = element.text.strip()
                if urlparse(loc).netloc.lower() != self.host:
                    continue
                if "sitemap" in loc.lower() and loc.lower().endswith(".xml"):
                    queue.append(loc)
                else:
                    page_urls.append(loc)
        # Stable unique order.
        return list(dict.fromkeys(page_urls))

    def scrape_html_catalog(self) -> tuple[list[dict], list[dict]]:
        """Fallback discovery from sitemap and HTML pages."""
        urls = self.sitemap_urls()
        product_urls = [u for u in urls if re.search(r"/p\d+(?:[/?#]|$)", u)]
        category_urls = [u for u in urls if re.search(r"/c\d+(?:[/?#]|$)", u)]
        LOG.info("بديل HTML: %d صفحة قسم و%d صفحة منتج من sitemap", len(category_urls), len(product_urls))

        categories: list[dict] = []
        for url in category_urls:
            try:
                content = self.request(url, json_expected=False)
                soup = BeautifulSoup(content, "html.parser")
                heading = soup.find("h1")
                name = heading.get_text(" ", strip=True) if heading else soup.title.get_text(" ", strip=True) if soup.title else url
                categories.append({"name": name, "url": url, "_path": name})
                for a in soup.find_all("a", href=True):
                    href = urljoin(url, a["href"])
                    if urlparse(href).netloc.lower() == self.host and re.search(r"/p\d+(?:[/?#]|$)", href):
                        product_urls.append(urldefrag(href)[0])
            except Exception as exc:
                LOG.debug("تخطي قسم %s: %s", url, exc)

        products: list[dict] = []
        for url in list(dict.fromkeys(product_urls)):
            try:
                products.append(self.html_fallback(url))
            except Exception as exc:
                LOG.warning("تعذر قراءة صفحة المنتج %s: %s", url, exc)
        return categories, products


def escape_md(value: Any) -> str:
    text = clean_text(value)
    return text.replace("|", "\\|").replace("\r", " ").replace("\n", " ")


def money(value: Any, currency: str = "") -> str:
    if value in (None, ""):
        return ""
    amount = clean_text(value)
    return f"{amount} {currency}".strip()


def render_product(product: dict, index: int) -> str:
    pid = product_identifier(product) or str(index)
    name = clean_text(product.get("name")) or f"منتج {pid}"
    url = clean_text(product.get("url"))
    currency = clean_text(product.get("currency") or "SAR")
    lines = [f'<a id="product-{pid}"></a>', f"### {index}. [{name}]({url})" if url else f"### {index}. {name}", ""]

    fields = [
        ("رقم المنتج", pid),
        ("الموديل", product.get("mpn") or product.get("model")),
        ("SKU", product.get("sku")),
        ("الباركود", product.get("barcode") or product.get("gtin")),
        ("الماركة", get_nested_name(product.get("brand"))),
        ("السعر", money(product.get("price") or product.get("sale_price"), currency)),
        ("السعر قبل الخصم", money(product.get("regular_price"), currency)),
        ("الحالة", product.get("status")),
        ("متاح للشراء", "نعم" if product.get("is_available") is True else "لا" if product.get("is_available") is False else ""),
        ("الكمية", product.get("quantity") if product.get("quantity") not in (None, -1) else ("غير محدودة" if product.get("quantity") == -1 else "")),
        ("الوزن", product.get("weight")),
    ]
    for label, value in fields:
        text = clean_text(value)
        if text:
            lines.append(f"- **{label}:** {text}")

    cats = product.get("_categories") or []
    if cats:
        lines.append(f"- **الأقسام:** {', '.join(cats)}")
    tags = product.get("tags")
    tag_names = []
    for tag in as_list(tags):
        label = get_nested_name(tag)
        if label:
            tag_names.append(label)
    if tag_names:
        lines.append(f"- **الوسوم:** {', '.join(tag_names)}")

    images = image_urls(product)
    if images:
        lines.extend(["", "**الصور وروابطها:**", ""])
        for image_url, alt in images:
            lines.append(f"![{escape_md(alt)}]({image_url})")
            lines.append(f"- [فتح الصورة]({image_url})")

    description = html_to_markdown(product.get("description"))
    if description:
        lines.extend(["", "**الوصف والتفاصيل:**", "", description])

    options = as_list(product.get("options"))
    if options:
        lines.extend(["", "**الخيارات:**"])
        for option in options:
            option_name = clean_text(option.get("name") or option.get("label")) if isinstance(option, dict) else clean_text(option)
            details = as_list(option.get("details")) if isinstance(option, dict) else []
            values = []
            for detail in details:
                values.append(get_nested_name(detail))
            if not values and isinstance(option, dict):
                values = [get_nested_name(x) for x in as_list(option.get("values"))]
            values = [x for x in values if x]
            lines.append(f"- **{option_name or 'خيار'}:** {', '.join(values) if values else 'تفاصيل الخيار متاحة في بيانات المنتج'}")

    skus = as_list(product.get("skus"))
    if skus:
        lines.extend(["", "**المتغيرات / وحدات SKU:**"])
        for sku in skus:
            if isinstance(sku, dict):
                sku_parts = []
                for key, label in (("sku", "SKU"), ("price", "السعر"), ("quantity", "الكمية"), ("barcode", "باركود")):
                    if sku.get(key) not in (None, ""):
                        sku_parts.append(f"{label}: {clean_text(sku.get(key))}")
                if sku_parts:
                    lines.append("- " + " — ".join(sku_parts))

    lines.extend(["", "---", ""])
    return "\n".join(lines)


def build_markdown(store_url: str, categories: list[dict], products: list[dict], output_path: str) -> None:
    by_category: dict[str, list[dict]] = defaultdict(list)
    category_rows: dict[str, dict] = {}
    for category in categories:
        path = clean_text(category.get("_path") or category.get("name")) or "أقسام أخرى"
        category_rows[path] = category

    for product in products:
        product_categories = product.get("_categories") or []
        if not product_categories:
            product_categories = ["غير مصنف"]
        for category_name in product_categories:
            by_category[category_name].append(product)

    timestamp = datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M:%S %Z")
    lines = [
        "# كتالوج متجر سلكين — نسخة Markdown",
        "",
        f"- **المتجر المصدر:** [{store_url}]({store_url})",
        f"- **تاريخ الاستخراج:** {timestamp}",
        f"- **عدد الأقسام:** {len(categories)}",
        f"- **عدد المنتجات:** {len(products)}",
        "- **العملة الافتراضية عند غياب العملة:** SAR",
        "",
        "> الملف يجمع بيانات الكتالوج العامة التي أتاحها المتجر: الأقسام، روابط المنتجات، الأسعار، الأوصاف، المواصفات والصور. قد تختلف الحقول من منتج لآخر حسب البيانات المنشورة في المتجر.",
        "",
        "## فهرس الأقسام",
        "",
    ]
    category_names = sorted(set(by_category) | set(category_rows), key=lambda x: x.casefold())
    for number, name in enumerate(category_names, 1):
        anchor = re.sub(r"[^a-zA-Z0-9_-]+", "-", name).strip("-") or f"section-{number}"
        lines.append(f"{number}. [{name}](#category-{anchor}) — {len(by_category.get(name, []))} منتج")

    lines.extend(["", "## الأقسام والمنتجات", ""])
    for number, name in enumerate(category_names, 1):
        anchor = re.sub(r"[^a-zA-Z0-9_-]+", "-", name).strip("-") or f"section-{number}"
        category = category_rows.get(name, {})
        category_url = clean_text(category.get("url"))
        lines.append(f'<a id="category-{anchor}"></a>')
        lines.append(f"### {name}")
        if category_url:
            lines.append(f"رابط القسم: [{category_url}]({category_url})")
        cat_desc = html_to_markdown(category.get("description"))
        if cat_desc:
            lines.extend(["", cat_desc])
        entries = by_category.get(name, [])
        if not entries:
            lines.extend(["", "_لا توجد منتجات مرتبطة بهذا القسم في بيانات الاستخراج._", ""])
            continue
        for product in entries:
            pid = product_identifier(product)
            product_name = clean_text(product.get("name")) or f"منتج {pid}"
            lines.append(f"- [{product_name}](#product-{pid})")
        lines.append("")

    lines.extend(["", "## تفاصيل المنتجات", ""])
    # Each product detail is emitted once, even when assigned to multiple categories.
    for index, product in enumerate(products, 1):
        lines.append(render_product(product, index))

    lines.extend([
        "## ملاحظات",
        "",
        "- روابط الصور تشير إلى ملفات الصور المستضافة لدى المصدر؛ لم يتم تنزيل الصور إلى جهازك.",
        "- لم يتم نسخ تصميم المتجر أو صفحات الدفع والحسابات أو بيانات العملاء والطلبات.",
        "- راجع دقة البيانات والأسعار والتوفر قبل استيرادها إلى متجرك؛ قد تتغير بعد تاريخ الاستخراج.",
        "",
    ])

    with open(output_path, "w", encoding="utf-8-sig", newline="\n") as file:
        file.write("\n".join(lines))


def main() -> int:
    parser = argparse.ArgumentParser(
        description="استخراج الأقسام والمنتجات العامة من متجر سلة إلى ملف Markdown."
    )
    parser.add_argument("--url", default=DEFAULT_STORE, help=f"رابط المتجر (الافتراضي: {DEFAULT_STORE})")
    parser.add_argument("--output", default="silken_catalog.md", help="اسم ملف Markdown الناتج")
    parser.add_argument("--delay", type=float, default=0.45, help="الفاصل بين الطلبات بالثواني (الافتراضي 0.45)")
    parser.add_argument("--max-products", type=int, default=0, help="حد اختياري للاختبار؛ 0 يعني كل المنتجات")
    args = parser.parse_args()

    exporter = SallaExporter(args.url, delay=args.delay)
    categories: list[dict] = []
    discovered: dict[str, dict] = {}
    api_ok = False

    try:
        LOG.info("جاري قراءة شجرة الأقسام من واجهة سلة العامة...")
        categories = exporter.get_categories()
        LOG.info("تم العثور على %d قسمًا/قسمًا فرعيًا", len(categories))

        # Collect products per category so every product gets its category path.
        for category in categories:
            numeric_id = category.get("id_")
            if numeric_id is None:
                continue
            category_name = clean_text(category.get("_path") or category.get("name"))
            try:
                LOG.info("قراءة منتجات القسم: %s", category_name)
                items = exporter.get_product_pages("categories", str(numeric_id))
                for item in items:
                    pid = product_identifier(item)
                    if not pid:
                        continue
                    entry = discovered.setdefault(pid, dict(item))
                    entry.setdefault("_categories", [])
                    if category_name and category_name not in entry["_categories"]:
                        entry["_categories"].append(category_name)
            except Exception as exc:
                LOG.warning("تعذر قراءة منتجات القسم %s: %s", category_name, exc)

        # Latest is a safety net for products not assigned to a visible category.
        LOG.info("مراجعة قائمة جميع المنتجات عبر مصدر أحدث المنتجات...")
        latest_items = exporter.get_product_pages("latest")
        for item in latest_items:
            pid = product_identifier(item)
            if pid:
                discovered.setdefault(pid, dict(item))
        api_ok = bool(discovered)
    except Exception as exc:
        LOG.warning("تعذر استخدام واجهة سلة العامة: %s", exc)

    if not api_ok:
        LOG.warning("الانتقال إلى بديل صفحات HTML وخرائط الموقع...")
        categories, fallback_products = exporter.scrape_html_catalog()
        for item in fallback_products:
            pid = product_identifier(item) or clean_text(item.get("url"))
            if pid:
                discovered[pid] = item

    if not discovered:
        LOG.error("لم يتم العثور على منتجات. قد يكون المتجر حجب الطلبات أو تغيرت واجهة سلة.")
        LOG.error("جرّب فتح المتجر في المتصفح، أو تشغيل السكربت لاحقًا، أو زيادة مهلة --delay.")
        return 2

    product_items = list(discovered.values())
    if args.max_products and args.max_products > 0:
        product_items = product_items[:args.max_products]

    completed: list[dict] = []
    for number, item in enumerate(product_items, 1):
        pid = product_identifier(item)
        if pid:
            LOG.info("تفاصيل المنتج %d/%d: %s", number, len(product_items), clean_text(item.get("name")) or pid)
            detail = exporter.get_product_details(pid)
            if detail:
                categories_for_product = item.get("_categories", [])
                merged = dict(item)
                merged.update(detail)
                merged["_categories"] = categories_for_product
                item = merged
            elif not item.get("description"):
                url = clean_text(item.get("url"))
                if url:
                    try:
                        fallback = exporter.html_fallback(url)
                        for key, value in fallback.items():
                            if value and not item.get(key):
                                item[key] = value
                    except Exception:
                        pass
        # Category from product payload if list/category association was missing.
        if not item.get("_categories"):
            cat = item.get("category")
            cat_name = get_nested_name(cat)
            if cat_name:
                item["_categories"] = [cat_name]
        completed.append(item)

    # Add product-derived categories missed by the category tree/listing.
    existing_paths = {clean_text(c.get("_path") or c.get("name")) for c in categories}
    for product in completed:
        for category_name in product.get("_categories", []):
            if category_name and category_name not in existing_paths:
                categories.append({"name": category_name, "_path": category_name})
                existing_paths.add(category_name)

    build_markdown(args.url.rstrip("/"), categories, completed, args.output)
    LOG.info("اكتمل الاستخراج: %d منتجًا، %d قسمًا", len(completed), len(categories))
    LOG.info("ملف النتيجة: %s", args.output)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        LOG.warning("تم إيقاف العملية من المستخدم.")
        raise SystemExit(130)
    except Exception as exc:
        LOG.error("حدث خطأ غير متوقع: %s", exc)
        raise SystemExit(1)
