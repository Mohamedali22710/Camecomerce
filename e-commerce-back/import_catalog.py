#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
Silken Catalog & Images Full Importer to MongoDB Atlas & Cloudinary
===============================================================================
Features:
1. Reads database & Cloudinary credentials from `config/.env` or CLI arguments.
2. Supports fully translated catalogs (`silken_catalog_fully_translated.md`)
   with full Arabic, English, and French names & descriptions.
3. Automatically bypasses Windows 260-character path limit with `\\\\?\\`.
4. Uploads unique images to Cloudinary in parallel (multithreaded).
5. Cleans up old test data (Categories, Subcategories, Products).
6. Creates 9 Main Categories with multilingual names (ar, en, fr).
7. Creates 34 Subcategories linked to actual MongoDB Category ObjectIds.
8. Inserts 140 Products with:
   - Multilingual names and descriptions (ar, en, fr)
   - Strict zero-discount (`discount = 0`)
   - Original prices and brand metadata
   - Cloudinary image URLs in exact manifest order
   - Standard inventory variants
9. Generates detailed JSON and Markdown execution reports.

Usage:
  python import_catalog.py
  python import_catalog.py --dry-run
  python import_catalog.py --workers 12
  python import_catalog.py --skip-upload   # if images are already uploaded
  python import_catalog.py --help
===============================================================================
"""

import os
import sys
import re
import csv
import json
import time
import argparse
import logging
from pathlib import Path
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Optional, Tuple, Set

# ── Base Directory Resolution ────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
SCRAPING_DIR = PROJECT_ROOT / "e-commerce-front" / "Web Scraping"
TRANSLATED_CATALOG = SCRAPING_DIR / "silken_catalog_fully_translated.md"
ORIGINAL_CATALOG = SCRAPING_DIR / "silken_catalog(1).md"
DEFAULT_CATALOG_FILE = TRANSLATED_CATALOG if TRANSLATED_CATALOG.exists() else ORIGINAL_CATALOG
IMAGES_DIR = SCRAPING_DIR / "silken_images"
MANIFEST_FILE = IMAGES_DIR / "image_manifest.csv"
REPORT_MD = SCRIPT_DIR / "IMPORT_REPORT.md"
REPORT_JSON = SCRIPT_DIR / "import_report.json"
CACHE_JSON = SCRIPT_DIR / "cloudinary_url_cache.json"

# ── Logging Configuration ────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(str(SCRIPT_DIR / "import_catalog.log"), encoding="utf-8"),
    ],
)
log = logging.getLogger("CatalogImporter")


def load_env_file(env_path: Path) -> Dict[str, str]:
    """Parse a .env file and return key-value pairs."""
    env_vars = {}
    if not env_path.exists():
        return env_vars
    for line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        val = val.strip().strip('"').strip("'")
        env_vars[key.strip()] = val
    return env_vars


def to_windows_long_path(p: Path) -> str:
    """Return \\\\?\\-prefixed absolute path to bypass Windows 260-char MAX_PATH limit."""
    abs_str = str(p.resolve())
    if sys.platform == "win32" and not abs_str.startswith("\\\\?\\"):
        return "\\\\?\\" + abs_str
    return abs_str


def clean_markdown_desc(desc: str) -> str:
    """Strip markdown images, links, bold tags, and excessive spacing."""
    if not desc:
        return ""
    desc = re.sub(r"!\[[^\]]*\]\([^)]+\)", "", desc)
    desc = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", desc)
    desc = re.sub(r"\*\*([^*]+)\*\*", r"\1", desc)
    desc = re.sub(r"\*([^*]+)\*", r"\1", desc)
    desc = re.sub(r"\n{3,}", "\n\n", desc)
    return desc.strip()


def parse_catalog(filepath: Path) -> dict:
    """
    Parse catalog markdown file extracting categories, subcategories, and products.
    Automatically detects if file is multilingual (AR / EN / FR).
    """
    text = filepath.read_text(encoding="utf-8")
    is_translated = "Category name (English):" in text or "English name:" in text

    unique_top_cats = []
    unique_subcats = []
    seen_top = {}
    seen_sub = {}

    if is_translated:
        cat_matches = list(re.finditer(
            r'<a id="category-[^"]*"></a>\s*\n### ([^\n]+)\s*\n'
            r'- \*\*اسم القسم بالعربية:\*\* ([^\n]+)\s*\n'
            r'- \*\*Category name \(English\):\*\* ([^\n]+)\s*\n'
            r'- \*\*Nom de catégorie \(français\):\*\* ([^\n]+)',
            text
        ))
        for m in cat_matches:
            full_ar = m.group(1).strip()
            full_en = m.group(3).strip()
            full_fr = m.group(4).strip()

            ar_parts = [p.strip() for p in full_ar.split(" / ")]
            en_parts = [p.strip() for p in full_en.split(" / ")]
            fr_parts = [p.strip() for p in full_fr.split(" / ")]

            if len(ar_parts) == 1:
                name_ar = ar_parts[0]
                if name_ar not in seen_top:
                    seen_top[name_ar] = True
                    unique_top_cats.append({
                        "ar_name": name_ar,
                        "en_name": en_parts[0] if en_parts else name_ar,
                        "fr_name": fr_parts[0] if fr_parts else name_ar,
                    })
            else:
                parent_ar = ar_parts[0]
                sub_ar = " / ".join(ar_parts[1:])
                sub_en = " / ".join(en_parts[1:]) if len(en_parts) > 1 else full_en
                sub_fr = " / ".join(fr_parts[1:]) if len(fr_parts) > 1 else full_fr
                key = (parent_ar, sub_ar)
                if key not in seen_sub:
                    seen_sub[key] = True
                    unique_subcats.append({
                        "ar_name": sub_ar,
                        "en_name": sub_en,
                        "fr_name": sub_fr,
                        "parent_ar_name": parent_ar,
                    })
    else:
        section_matches = list(re.finditer(
            r'<a id="category-[^"]*"></a>\n### ([^\n]+)\nرابط القسم: ([^\n]+)',
            text
        ))
        for m in section_matches:
            full_name = m.group(1).strip()
            parts = [p.strip() for p in full_name.split(" / ")]
            if len(parts) == 1:
                name = parts[0]
                if name not in seen_top:
                    seen_top[name] = True
                    unique_top_cats.append({"ar_name": name, "en_name": name, "fr_name": name})
            else:
                parent_name = parts[0]
                sub_name = " / ".join(parts[1:])
                key = (parent_name, sub_name)
                if key not in seen_sub:
                    seen_sub[key] = True
                    unique_subcats.append({
                        "ar_name": sub_name,
                        "en_name": sub_name,
                        "fr_name": sub_name,
                        "parent_ar_name": parent_name,
                    })

    # Parse Products
    product_blocks = re.split(r'<a id="product-(\d+)"></a>', text)
    products = []
    for i in range(1, len(product_blocks), 2):
        pid = product_blocks[i]
        block = product_blocks[i + 1] if i + 1 < len(product_blocks) else ""

        ar_name = ""
        en_name = ""
        fr_name = ""

        if is_translated:
            ar_m = re.search(r'\*\*الاسم بالعربية:\*\* (.+)', block)
            en_m = re.search(r'\*\*English name:\*\* (.+)', block)
            fr_m = re.search(r'\*\*Nom français:\*\* (.+)', block)
            if ar_m:
                ar_name = ar_m.group(1).strip()
            if en_m:
                en_name = en_m.group(1).strip()
            if fr_m:
                fr_name = fr_m.group(1).strip()

        if not ar_name:
            title_m = re.search(r"### \d+\. \[([^\]]+)\]\(([^)]+)\)", block)
            if not title_m:
                continue
            ar_name = title_m.group(1).strip()

        if not en_name:
            en_name = ar_name
        if not fr_name:
            fr_name = ar_name

        brand_m = re.search(r"\*\*الماركة:\*\* (.+)", block)
        brand = brand_m.group(1).strip() if brand_m else None

        price_m = re.search(r"\*\*السعر:\*\* ([\d.]+)", block)
        price = float(price_m.group(1)) if price_m else 1.0

        cats_m = re.search(r"\*\*الأقسام:\*\* (.+)", block)
        cat_paths = [c.strip() for c in cats_m.group(1).split(",")] if cats_m else []

        deepest_path = ""
        max_depth = 0
        for cp in cat_paths:
            depth = cp.count(" / ")
            if depth > max_depth or (depth == max_depth and not deepest_path):
                max_depth = depth
                deepest_path = cp

        path_parts = [p.strip() for p in deepest_path.split(" / ")] if deepest_path else []
        top_cat = path_parts[0] if path_parts else None
        sub_cat = " / ".join(path_parts[1:]) if len(path_parts) > 1 else None

        ar_desc = ""
        en_desc = ""
        fr_desc = ""

        if is_translated:
            ar_desc_m = re.search(r"\*\*الوصف والتفاصيل:\*\*\n+(.*?)(?=\n### Description and details|\n---|\Z)", block, re.DOTALL)
            en_desc_m = re.search(r"### Description and details \(English\)\n+(.*?)(?=\n### Description et détails|\n---|\Z)", block, re.DOTALL)
            fr_desc_m = re.search(r"### Description et détails \(Français\)\n+(.*?)(?=\n### Options|\n---|\Z)", block, re.DOTALL)

            ar_desc = clean_markdown_desc(ar_desc_m.group(1)) if ar_desc_m else ar_name
            en_desc = clean_markdown_desc(en_desc_m.group(1)) if en_desc_m else en_name
            fr_desc = clean_markdown_desc(fr_desc_m.group(1)) if fr_desc_m else fr_name
        else:
            desc_m = re.search(r"\*\*الوصف والتفاصيل:\*\*\n+(.*?)(?:\n---|\Z)", block, re.DOTALL)
            ar_desc = clean_markdown_desc(desc_m.group(1)) if desc_m else ar_name
            en_desc = ar_desc
            fr_desc = ar_desc

        products.append({
            "source_id": pid,
            "ar_name": ar_name,
            "en_name": en_name,
            "fr_name": fr_name,
            "brand": brand,
            "price": max(1.0, price),
            "top_cat": top_cat,
            "sub_cat": sub_cat,
            "ar_description": ar_desc or ar_name,
            "en_description": en_desc or en_name,
            "fr_description": fr_desc or fr_name,
        })

    return {
        "categories": unique_top_cats,
        "subcategories": unique_subcats,
        "products": products,
    }


def load_manifest() -> Tuple[Dict[str, List[Dict]], Dict[str, str], int]:
    """Load image_manifest.csv mapping products to images and finding unique image files."""
    manifest_by_pid: Dict[str, List[Dict]] = {}
    unique_images: Dict[str, str] = {}
    total_entries = 0

    with open(MANIFEST_FILE, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            total_entries += 1
            pid = row["product_id"].strip()
            source_url = row["source_url"].strip()
            rel_file = row["file"].strip()
            order = int(row["image_order"])

            if pid not in manifest_by_pid:
                manifest_by_pid[pid] = []

            manifest_by_pid[pid].append({
                "image_order": order,
                "file": rel_file,
                "source_url": source_url,
            })

            if source_url not in unique_images and rel_file:
                unique_images[source_url] = rel_file

    for pid in manifest_by_pid:
        manifest_by_pid[pid].sort(key=lambda x: x["image_order"])

    log.info(f"Loaded manifest: {len(manifest_by_pid)} products, {total_entries} image entries, {len(unique_images)} unique images.")
    return manifest_by_pid, unique_images, total_entries


def upload_single_image(source_url: str, rel_file: str) -> Tuple[str, Optional[str], Optional[str]]:
    """Upload one image file to Cloudinary."""
    import cloudinary.uploader

    full_path = IMAGES_DIR / rel_file
    win_path = to_windows_long_path(full_path)

    if not os.path.exists(win_path):
        return source_url, None, f"File not found on disk: {rel_file}"

    try:
        res = cloudinary.uploader.upload(
            win_path,
            folder="cctv_products",
            resource_type="image",
        )
        secure_url = res.get("secure_url")
        if secure_url:
            return source_url, secure_url, None
        return source_url, None, "No secure_url returned by Cloudinary"
    except Exception as e:
        return source_url, None, str(e)


def upload_all_images(unique_images: Dict[str, str], workers: int = 8, use_cache: bool = True) -> Tuple[Dict[str, str], List[Dict]]:
    """Parallel image uploader with local cache fallback."""
    url_cache: Dict[str, str] = {}
    failed_uploads: List[Dict] = []

    # Check for existing local cache
    if use_cache and CACHE_JSON.exists():
        try:
            cached = json.loads(CACHE_JSON.read_text(encoding="utf-8"))
            if isinstance(cached, dict) and len(cached) > 0:
                log.info(f"Found existing Cloudinary URL cache with {len(cached)} items.")
                url_cache.update(cached)
        except Exception as e:
            log.warning(f"Could not read existing cache: {e}")

    # Determine remaining images that need uploading
    to_upload = {s_url: r_file for s_url, r_file in unique_images.items() if s_url not in url_cache}
    if not to_upload:
        log.info("All images already present in Cloudinary cache. Skipping uploads.")
        return url_cache, failed_uploads

    log.info(f"Uploading {len(to_upload)} new unique images using {workers} parallel threads...")
    completed = 0
    total = len(to_upload)
    start_t = time.time()

    with ThreadPoolExecutor(max_workers=workers) as executor:
        future_map = {
            executor.submit(upload_single_image, s_url, r_file): (s_url, r_file)
            for s_url, r_file in to_upload.items()
        }

        for future in as_completed(future_map):
            s_url, r_file = future_map[future]
            try:
                source_url, cld_url, err = future.result()
                if cld_url:
                    url_cache[source_url] = cld_url
                else:
                    failed_uploads.append({"source_url": source_url, "file": r_file, "error": err})
            except Exception as e:
                failed_uploads.append({"source_url": s_url, "file": r_file, "error": str(e)})

            completed += 1
            if completed % 25 == 0 or completed == total:
                elapsed = time.time() - start_t
                log.info(f"  Processed {completed}/{total} images ({len(url_cache)} cached/uploaded, {len(failed_uploads)} failed) [{elapsed:.1f}s]")

    # Persist cache
    try:
        CACHE_JSON.write_text(json.dumps(url_cache, indent=2, ensure_ascii=False), encoding="utf-8")
    except Exception as e:
        log.warning(f"Could not save cache: {e}")

    return url_cache, failed_uploads


def main():
    parser = argparse.ArgumentParser(description="Import Silken CCTV Catalog into MongoDB and Cloudinary")
    parser.add_argument("--catalog", help="Path to catalog markdown file (defaults to silken_catalog_fully_translated.md)")
    parser.add_argument("--mongo-uri", help="MongoDB Connection URI (defaults to config/.env)")
    parser.add_argument("--db-name", default="test", help="MongoDB database name (default: test)")
    parser.add_argument("--cloud-name", help="Cloudinary cloud name (defaults to config/.env)")
    parser.add_argument("--api-key", help="Cloudinary API key (defaults to config/.env)")
    parser.add_argument("--api-secret", help="Cloudinary API secret (defaults to config/.env)")
    parser.add_argument("--admin-email", help="Admin email for addedByEmail field (defaults to config/.env)")
    parser.add_argument("--workers", type=int, default=8, help="Number of concurrent upload threads (default: 8)")
    parser.add_argument("--skip-upload", action="store_true", help="Skip Cloudinary upload and use cached URLs if available")
    parser.add_argument("--dry-run", action="store_true", help="Parse files without inserting into DB or uploading")
    args = parser.parse_args()

    # Load from config/.env
    env_file = SCRIPT_DIR / "config" / ".env"
    if not env_file.exists():
        env_file = PROJECT_ROOT / "e-commerce-back" / "config" / ".env"
    env_vars = load_env_file(env_file)

    mongo_uri = args.mongo_uri or env_vars.get("MONGODB_URI") 
    cloud_name = args.cloud_name or env_vars.get("CLOUDINARY_NAME") 
    api_key = args.api_key or env_vars.get("CLOUDINARY_KEY") 
    api_secret = args.api_secret or env_vars.get("CLOUDINARY_SECRET")
    admin_email = args.admin_email or env_vars.get("EMAIL")

    catalog_path = Path(args.catalog) if args.catalog else DEFAULT_CATALOG_FILE

    start_time = time.time()
    log.info("=" * 70)
    log.info("🚀 STARTING SILKEN CCTV CATALOG IMPORT")
    log.info("=" * 70)
    log.info(f"Catalog File: {catalog_path.name}")
    log.info(f"MongoDB Target: {mongo_uri[:35]}... (DB: {args.db_name})")
    log.info(f"Cloudinary: {cloud_name}")
    log.info(f"Admin Email: {admin_email}")

    if not catalog_path.exists():
        log.error(f"Catalog file not found: {catalog_path}")
        sys.exit(1)
    if not MANIFEST_FILE.exists():
        log.error(f"Manifest file not found: {MANIFEST_FILE}")
        sys.exit(1)

    # 1. Parse files
    manifest_by_pid, unique_images, total_manifest_rows = load_manifest()
    catalog = parse_catalog(catalog_path)

    # Add default 'عام' subcategories for parent categories with direct products
    top_cats_needing_default: Set[str] = set()
    for p in catalog["products"]:
        if not p.get("sub_cat") and p.get("top_cat"):
            top_cats_needing_default.add(p["top_cat"])

    for top_name in sorted(top_cats_needing_default):
        exists = any(s["parent_ar_name"] == top_name and s["ar_name"] == "عام" for s in catalog["subcategories"])
        if not exists:
            catalog["subcategories"].append({
                "ar_name": "عام",
                "en_name": "General",
                "fr_name": "Général",
                "parent_ar_name": top_name,
            })
            log.info(f"  Added default subcategory 'عام' ('General' / 'Général') for category '{top_name}'")

    log.info(f"Parsed: {len(catalog['categories'])} Main Categories, {len(catalog['subcategories'])} Subcategories, {len(catalog['products'])} Products.")

    if args.dry_run:
        log.info("🔍 DRY-RUN PREVIEW:")
        log.info(f"  Categories: {[c['ar_name'] + ' (' + c['en_name'] + ')' for c in catalog['categories'][:3]]}...")
        log.info(f"  Subcategories: {[s['ar_name'] + ' (' + s['en_name'] + ')' for s in catalog['subcategories'][:3]]}...")
        log.info(f"  Products: {[p['ar_name'][:25] + ' -> EN: ' + p['en_name'][:25] for p in catalog['products'][:3]]}...")
        log.info("DRY-RUN completed successfully. No changes made.")
        return

    # 2. Setup Cloudinary & Upload images
    import cloudinary
    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret,
        secure=True,
    )

    url_cache = {}
    failed_uploads = []
    if not args.skip_upload:
        url_cache, failed_uploads = upload_all_images(unique_images, workers=args.workers)
    else:
        if CACHE_JSON.exists():
            url_cache = json.loads(CACHE_JSON.read_text(encoding="utf-8"))
            log.info(f"Loaded {len(url_cache)} Cloudinary URLs from cache.")

    # 3. Connect to MongoDB
    from pymongo import MongoClient
    log.info("Connecting to MongoDB Atlas...")
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=30000)
    db = client[args.db_name]

    # 4. Clean old test data
    log.info("🧹 Purging previous catalog data...")
    p_del = db.products.delete_many({})
    s_del = db.subcategories.delete_many({})
    c_del = db.categories.delete_many({})
    log.info(f"Cleaned up: {p_del.deleted_count} products, {s_del.deleted_count} subcategories, {c_del.deleted_count} categories.")

    # 5. Insert Categories
    log.info(f"📁 Creating {len(catalog['categories'])} Main Categories...")
    cat_map: Dict[str, any] = {}
    for cat in catalog["categories"]:
        name_ar = cat["ar_name"]
        name_en = cat.get("en_name") or name_ar
        name_fr = cat.get("fr_name") or name_ar
        doc = {
            "en_name": name_en,
            "ar_name": name_ar,
            "fr_name": name_fr,
            "imageURL": None,
            "addedByEmail": admin_email,
            "isActive": True,
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc),
        }
        res = db.categories.insert_one(doc)
        cat_map[name_ar] = res.inserted_id
        log.info(f"  ✅ Category: '{name_ar}' | EN: '{name_en}' (ID: {res.inserted_id})")

    # 6. Insert Subcategories
    log.info(f"📂 Creating {len(catalog['subcategories'])} Subcategories...")
    sub_map: Dict[Tuple[str, str], any] = {}
    for sub in catalog["subcategories"]:
        sub_ar = sub["ar_name"]
        sub_en = sub.get("en_name") or sub_ar
        sub_fr = sub.get("fr_name") or sub_ar
        parent_name = sub["parent_ar_name"]
        parent_id = cat_map.get(parent_name)
        if not parent_id:
            log.warning(f"  Parent category '{parent_name}' not found for subcategory '{sub_ar}'")
            continue

        doc = {
            "en_name": sub_en,
            "ar_name": sub_ar,
            "fr_name": sub_fr,
            "categoryId": parent_id,
            "addedByEmail": admin_email,
            "isActive": True,
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc),
        }
        res = db.subcategories.insert_one(doc)
        sub_map[(parent_name, sub_ar)] = res.inserted_id
        log.info(f"  ✅ Subcategory: '{sub_ar}' | EN: '{sub_en}' -> '{parent_name}' (ID: {res.inserted_id})")

    # 8. Insert Products
    log.info(f"📦 Inserting {len(catalog['products'])} Products...")
    default_variant = [{"color": "Default", "size": "Default", "stock": 100}]
    created_products = 0
    failed_products: List[Dict] = []
    total_images_assigned = 0

    for idx, p in enumerate(catalog["products"], start=1):
        pid = p["source_id"]
        ar_name = p["ar_name"]
        en_name = p.get("en_name") or ar_name
        fr_name = p.get("fr_name") or ar_name
        top_cat = p.get("top_cat")
        sub_cat = p.get("sub_cat")

        sub_id = None
        if top_cat and sub_cat:
            sub_id = sub_map.get((top_cat, sub_cat))
        if not sub_id and top_cat:
            sub_id = sub_map.get((top_cat, "عام"))
        if not sub_id and top_cat:
            cat_id = cat_map.get(top_cat)
            if cat_id:
                sub_doc = db.subcategories.find_one({"categoryId": cat_id, "isActive": True})
                if sub_doc:
                    sub_id = sub_doc["_id"]

        if not sub_id:
            log.error(f"  ❌ No subcategory match for [{pid}] {ar_name}")
            failed_products.append({"id": pid, "name": ar_name, "reason": "No subcategory match"})
            continue

        # Cloudinary URLs in manifest order
        manifest_items = manifest_by_pid.get(pid, [])
        product_cloudinary_urls = []
        for m_item in manifest_items:
            s_url = m_item["source_url"]
            c_url = url_cache.get(s_url)
            if c_url:
                product_cloudinary_urls.append(c_url)

        total_images_assigned += len(product_cloudinary_urls)

        doc = {
            "en_name": en_name,
            "ar_name": ar_name,
            "fr_name": fr_name,
            "en_description": p.get("en_description") or p.get("ar_description") or ar_name,
            "ar_description": p.get("ar_description") or ar_name,
            "fr_description": p.get("fr_description") or p.get("ar_description") or ar_name,
            "price": float(p["price"]),
            "discount": 0,  # Strict: zero discount
            "brand": p.get("brand"),
            "imageURLs": json.dumps(product_cloudinary_urls) if product_cloudinary_urls else None,
            "colorImages": None,
            "specifications": None,
            "variants": json.dumps(default_variant),
            "subcategoryId": sub_id,
            "addedByEmail": admin_email,
            "isActive": True,
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc),
        }

        try:
            db.products.insert_one(doc)
            created_products += 1
            if created_products % 20 == 0 or created_products == len(catalog["products"]):
                log.info(f"  Progress: {created_products}/{len(catalog['products'])} products inserted.")
        except Exception as e:
            log.error(f"  ❌ Failed to insert [{pid}] {ar_name}: {e}")
            failed_products.append({"id": pid, "name": ar_name, "reason": str(e)})

    client.close()
    elapsed = time.time() - start_time

    # 9. Reports
    summary = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "elapsed_seconds": round(elapsed, 1),
        "categories_created": len(cat_map),
        "subcategories_created": len(sub_map),
        "products_created": created_products,
        "products_failed": len(failed_products),
        "failed_products": failed_products,
        "unique_images_uploaded": len(url_cache),
        "failed_image_uploads": len(failed_uploads),
        "total_images_assigned": total_images_assigned,
    }

    REPORT_JSON.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")

    md_report = f"""# تقرير استيراد كتالوج كاميرات المراقبة

- **تاريخ التنفيذ:** {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}
- **الوقت المستغرق:** {elapsed:.1f} ثانية

## ملخص الإحصائيات:
- **الأقسام الرئيسية (Categories):** {len(cat_map)}
- **الأقسام الفرعية (Subcategories):** {len(sub_map)}
- **المنتجات المنشأة (Products):** {created_products}
- **المنتجات التي فشلت:** {len(failed_products)}
- **الصور المرفوعة على Cloudinary:** {len(url_cache)}
- **إجمالي الصور المربوطة بالمنتجات:** {total_images_assigned}
- **الخصومات:** 0% (بدون أي خصومات حسب المتطلبات)
- **اللغات:** العربية، الإنجليزية، الفرنسية (AR, EN, FR)
"""
    REPORT_MD.write_text(md_report, encoding="utf-8")

    log.info("=" * 70)
    log.info("🎉 IMPORT COMPLETED SUCCESSFULLY!")
    log.info(f"Categories: {len(cat_map)} | Subcategories: {len(sub_map)} | Products: {created_products} | Images: {len(url_cache)}")
    log.info(f"Total time: {elapsed:.1f}s")
    log.info("=" * 70)


if __name__ == "__main__":
    main()
