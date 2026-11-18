#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Download product images from the Silken Markdown catalog.

Expected input (by default, next to this script):
    silken_catalog(1).md

Output:
    silken_images/
      001_167389524_<product-name>/
        <product-name>_01.jpg
        <product-name>_02.jpg
      image_manifest.csv
      download_report.txt

Repeated image URLs are downloaded once, then placed in each relevant
product folder so every product remains self-contained.
"""

from __future__ import annotations

import argparse
import csv
import mimetypes
import re
import sys
import threading
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urlparse

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_CATALOG_NAMES = ("silken_catalog(1).md", "silken_catalog.md")
IMAGE_RE = re.compile(r"!\[[^\]]*\]\((https?://[^)]+)\)")
PRODUCT_ANCHOR_RE = re.compile(r'<a id="product-(\d+)"></a>')
PRODUCT_TITLE_RE = re.compile(r"^###\s+\d+\.\s+\[(.*?)\]\((https?://.*?)\)\s*$", re.M)
INVALID_FILENAME_RE = re.compile(r'[<>:"/\\|?*\x00-\x1f]')

_thread_local = threading.local()


def safe_filename(value: str, max_length: int = 105) -> str:
    """Create a Windows-safe filename while keeping Arabic characters."""
    value = INVALID_FILENAME_RE.sub("_", value)
    value = re.sub(r"\s+", " ", value).strip(" .")
    value = re.sub(r"_+", "_", value)
    if not value:
        value = "product"
    # Windows reserved device names.
    if value.upper() in {"CON", "PRN", "AUX", "NUL", *(f"COM{i}" for i in range(1, 10)), *(f"LPT{i}" for i in range(1, 10))}:
        value = f"_{value}"
    return value[:max_length].rstrip(" .") or "product"


def find_catalog(user_path: str | None) -> Path:
    if user_path:
        p = Path(user_path).expanduser()
        if not p.is_absolute():
            p = (BASE_DIR / p).resolve()
        if not p.is_file():
            raise FileNotFoundError(f"ملف الكتالوج غير موجود: {p}")
        return p

    for name in DEFAULT_CATALOG_NAMES:
        p = BASE_DIR / name
        if p.is_file():
            return p

    raise FileNotFoundError(
        "لم أجد ملف الكتالوج بجوار السكربت. ضع silken_catalog(1).md "
        "في نفس المجلد، أو شغّل السكربت مع --catalog لمساره."
    )


def parse_products(markdown: str) -> list[dict]:
    """Parse each product's own detail section, preserving image order."""
    if "## تفاصيل المنتجات" not in markdown:
        raise ValueError("لم أجد قسم 'تفاصيل المنتجات' داخل ملف Markdown.")

    details = markdown.split("## تفاصيل المنتجات", 1)[1]
    anchors = list(PRODUCT_ANCHOR_RE.finditer(details))
    products: list[dict] = []

    for index, match in enumerate(anchors, start=1):
        block_end = anchors[index].start() if index < len(anchors) else len(details)
        block = details[match.start():block_end]
        title_match = PRODUCT_TITLE_RE.search(block)
        if not title_match:
            # Keep the record visible instead of silently dropping a product.
            title = f"product_{match.group(1)}"
        else:
            title = title_match.group(1).strip()

        product_id = match.group(1)
        image_urls = list(dict.fromkeys(IMAGE_RE.findall(block)))
        if not image_urls:
            continue

        products.append({
            "index": len(products) + 1,
            "id": product_id,
            "title": title,
            "images": image_urls,
        })

    return products


def make_session() -> requests.Session:
    session = requests.Session()
    retry = Retry(
        total=4,
        connect=4,
        read=4,
        status=4,
        backoff_factor=0.6,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset({"GET"}),
        respect_retry_after_header=True,
    )
    adapter = HTTPAdapter(max_retries=retry, pool_connections=8, pool_maxsize=8)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Referer": "https://silken.sa/",
    })
    return session


def get_session() -> requests.Session:
    if not hasattr(_thread_local, "session"):
        _thread_local.session = make_session()
    return _thread_local.session


def choose_extension(url: str, content_type: str | None) -> str:
    suffix = Path(urlparse(url).path).suffix.lower()
    if suffix in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".bmp", ".tif", ".tiff"}:
        return ".jpg" if suffix == ".jpeg" else suffix

    mime = (content_type or "").split(";", 1)[0].strip().lower()
    ext = mimetypes.guess_extension(mime) if mime else None
    if ext == ".jpe":
        ext = ".jpg"
    return ext or ".img"


def fetch_image(url: str) -> tuple[str, bytes | None, str | None, str | None]:
    try:
        response = get_session().get(url, timeout=(15, 60))
        response.raise_for_status()
        data = response.content
        if not data:
            return url, None, None, "الملف المستلم فارغ"
        content_type = response.headers.get("Content-Type", "")
        if content_type and not content_type.lower().startswith("image/"):
            # Some CDNs return generic content types, so reject only obvious HTML.
            if "text/html" in content_type.lower():
                return url, None, None, f"الرابط أعاد صفحة HTML بدل صورة ({content_type})"
        return url, data, content_type, None
    except requests.RequestException as exc:
        return url, None, None, str(exc)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="تنزيل صور منتجات متجر سلكين وترتيبها حسب المنتج."
    )
    parser.add_argument("--catalog", help="مسار ملف silken_catalog.md (اختياري)")
    parser.add_argument("--output", default="silken_images", help="مجلد الحفظ (افتراضي: silken_images)")
    parser.add_argument("--workers", type=int, default=8, help="عدد التنزيلات المتوازية (افتراضي: 8، الحد الأقصى 16)")
    args = parser.parse_args()

    workers = max(1, min(args.workers, 16))
    try:
        catalog_path = find_catalog(args.catalog)
        markdown = catalog_path.read_text(encoding="utf-8-sig")
        products = parse_products(markdown)
    except (OSError, ValueError) as exc:
        print(f"خطأ: {exc}", file=sys.stderr)
        return 1

    if not products:
        print("لم أجد منتجات تحتوي على صور في ملف الكتالوج.", file=sys.stderr)
        return 1

    output_dir = Path(args.output)
    if not output_dir.is_absolute():
        output_dir = (BASE_DIR / output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    # One network download per unique URL, then copy it to all matching products.
    targets_by_url: dict[str, list[dict]] = defaultdict(list)
    manifest_rows: list[dict] = []
    for product in products:
        folder_name = f"{product['index']:03d}_{product['id']}_{safe_filename(product['title'], 58)}"
        product_dir = output_dir / folder_name
        product_dir.mkdir(parents=True, exist_ok=True)
        title_for_file = safe_filename(product["title"], 95)

        for image_number, url in enumerate(product["images"], start=1):
            target_stub = f"{title_for_file}_{image_number:02d}"
            target_info = {
                "product": product,
                "image_number": image_number,
                "url": url,
                "folder": product_dir,
                "stub": target_stub,
            }
            targets_by_url[url].append(target_info)
            manifest_rows.append({
                "product_order": product["index"],
                "product_id": product["id"],
                "product_name": product["title"],
                "image_order": image_number,
                "file": str(Path(folder_name) / f"{target_stub} (extension pending)"),
                "source_url": url,
                "status": "pending",
                "error": "",
            })

    unique_urls = list(targets_by_url)
    total_images = sum(len(items) for items in targets_by_url.values())
    print(f"ملف الكتالوج: {catalog_path.name}")
    print(f"المنتجات التي لها صور: {len(products)}")
    print(f"إجمالي ملفات الصور المطلوبة: {total_images}")
    print(f"روابط الصور الفريدة التي سيتم تنزيلها: {len(unique_urls)}")
    print(f"عدد الاتصالات المتوازية: {workers}")
    print(f"مجلد الحفظ: {output_dir}")
    print("\nبدأ التنزيل...\n")

    result_by_url: dict[str, tuple[bytes | None, str | None, str | None]] = {}
    failures: list[str] = []
    started = time.time()

    with ThreadPoolExecutor(max_workers=workers) as executor:
        future_map = {executor.submit(fetch_image, url): url for url in unique_urls}
        completed = 0
        for future in as_completed(future_map):
            url = future_map[future]
            try:
                returned_url, data, content_type, fetch_error = future.result()
                result_by_url[returned_url] = (data, content_type, fetch_error)
                if data is None:
                    failures.append(f"{url}\t{fetch_error or 'فشل التنزيل'}")
            except Exception as exc:  # Keep processing the rest if one task fails.
                result_by_url[url] = (None, None, str(exc))
                failures.append(f"{url}\t{exc}")
            completed += 1
            if completed % 25 == 0 or completed == len(unique_urls):
                print(f"تم تنزيل/فحص {completed}/{len(unique_urls)} رابط صورة...")

    # Save in the exact product/image order from the Markdown file.
    status_by_key: dict[tuple[str, int, str], tuple[str, str, str]] = {}
    for url, targets in targets_by_url.items():
        data, content_type, fetch_error = result_by_url.get(url, (None, None, "لم يتم استلام نتيجة التنزيل"))
        if data is None:
            for target in targets:
                key = (target["product"]["id"], target["image_number"], url)
                status_by_key[key] = ("failed", "", fetch_error or "فشل التنزيل")
            continue

        extension = choose_extension(url, content_type)
        for target in targets:
            filename = target["stub"] + extension
            destination = target["folder"] / filename
            key = (target["product"]["id"], target["image_number"], url)
            try:
                if destination.is_file() and destination.stat().st_size > 0:
                    status_by_key[key] = ("already_exists", str(Path(target["folder"].name) / filename), "")
                    continue
                temp_path = destination.with_suffix(destination.suffix + ".part")
                temp_path.write_bytes(data)
                temp_path.replace(destination)
                status_by_key[key] = ("downloaded", str(Path(target["folder"].name) / filename), "")
            except OSError as exc:
                status_by_key[key] = ("failed", str(Path(target["folder"].name) / filename), str(exc))

    # Update CSV paths/statuses (UTF-8 BOM helps Excel display Arabic correctly).
    for row in manifest_rows:
        key = (row["product_id"], row["image_order"], row["source_url"])
        status, relative_file, error = status_by_key.get(key, ("failed", "", "لم يتم تسجيل حالة الملف"))
        row["status"] = status
        row["error"] = error
        if relative_file:
            row["file"] = relative_file

    manifest_path = output_dir / "image_manifest.csv"
    with manifest_path.open("w", newline="", encoding="utf-8-sig") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=[
            "product_order", "product_id", "product_name", "image_order", "file", "source_url", "status", "error"
        ])
        writer.writeheader()
        writer.writerows(manifest_rows)

    failed_rows = [row for row in manifest_rows if row["status"] == "failed"]
    report_path = output_dir / "download_report.txt"
    elapsed = time.time() - started
    report_lines = [
        "Silken image download report",
        f"Products with images: {len(products)}",
        f"Image files requested: {total_images}",
        f"Unique source URLs: {len(unique_urls)}",
        f"Downloaded: {sum(row['status'] == 'downloaded' for row in manifest_rows)}",
        f"Already existed: {sum(row['status'] == 'already_exists' for row in manifest_rows)}",
        f"Failed: {len(failed_rows)}",
        f"Elapsed seconds: {elapsed:.1f}",
        "",
    ]
    if failed_rows:
        report_lines.append("Failed files:")
        for row in failed_rows:
            report_lines.append(f"- {row['product_name']} / image {row['image_order']}: {row['source_url']} | {row['error']}")
    else:
        report_lines.append("All requested images were saved successfully.")
    report_path.write_text("\n".join(report_lines), encoding="utf-8")

    saved_count = sum(row["status"] == "downloaded" for row in manifest_rows)
    existing_count = sum(row["status"] == "already_exists" for row in manifest_rows)
    print("\nانتهى التنزيل.")
    print(f"ملفات تم تنزيلها: {saved_count}")
    print(f"ملفات كانت موجودة بالفعل: {existing_count}")
    print(f"ملفات فشل تنزيلها: {len(failed_rows)}")
    print(f"راجع ملف الربط: {manifest_path.name}")
    print(f"راجع التقرير: {report_path.name}")
    print(f"المجلد: {output_dir}")

    return 0 if not failed_rows else 2


if __name__ == "__main__":
    raise SystemExit(main())
