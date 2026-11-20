#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Update MongoDB categories, subcategories, and products with English and French translations
from `silken_catalog_fully_translated.md`.
"""

import re
import sys
import json
from pathlib import Path
from pymongo import MongoClient

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
TRANSLATED_MD = PROJECT_ROOT / "e-commerce-front" / "Web Scraping" / "silken_catalog_fully_translated.md"

ENV_FILE = SCRIPT_DIR / "config" / ".env"
env_vars = {}
if ENV_FILE.exists():
    for line in ENV_FILE.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env_vars[k.strip()] = v.strip().strip('"').strip("'")

MONGO_URI = env_vars.get("MONGODB_URI", "Your MongoDB URL")
DB_NAME = "test"


def clean_markdown_desc(desc: str) -> str:
    if not desc:
        return ""
    desc = re.sub(r"!\[[^\]]*\]\([^)]+\)", "", desc)
    desc = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", desc)
    desc = re.sub(r"\*\*([^*]+)\*\*", r"\1", desc)
    desc = re.sub(r"\*([^*]+)\*", r"\1", desc)
    desc = re.sub(r"\n{3,}", "\n\n", desc)
    return desc.strip()


def main():
    print(f"Reading translations from: {TRANSLATED_MD}")
    text = TRANSLATED_MD.read_text(encoding="utf-8")

    # 1. Parse Category and Subcategory translations
    cat_matches = list(re.finditer(
        r'<a id="category-[^"]*"></a>\s*\n### ([^\n]+)\s*\n'
        r'- \*\*اسم القسم بالعربية:\*\* ([^\n]+)\s*\n'
        r'- \*\*Category name \(English\):\*\* ([^\n]+)\s*\n'
        r'- \*\*Nom de catégorie \(français\):\*\* ([^\n]+)',
        text
    ))

    categories_tr = {}     # ar_name -> {en, fr}
    subcategories_tr = {}  # (parent_ar, sub_ar) -> {en, fr}

    for m in cat_matches:
        full_ar = m.group(1).strip()
        full_en = m.group(3).strip()
        full_fr = m.group(4).strip()

        ar_parts = [p.strip() for p in full_ar.split(" / ")]
        en_parts = [p.strip() for p in full_en.split(" / ")]
        fr_parts = [p.strip() for p in full_fr.split(" / ")]

        if len(ar_parts) == 1:
            categories_tr[ar_parts[0]] = {
                "en": en_parts[0],
                "fr": fr_parts[0],
            }
        else:
            parent_ar = ar_parts[0]
            sub_ar = " / ".join(ar_parts[1:])
            sub_en = " / ".join(en_parts[1:]) if len(en_parts) > 1 else full_en
            sub_fr = " / ".join(fr_parts[1:]) if len(fr_parts) > 1 else full_fr
            subcategories_tr[(parent_ar, sub_ar)] = {
                "en": sub_en,
                "fr": sub_fr,
            }

    print(f"Loaded translations for {len(categories_tr)} categories and {len(subcategories_tr)} subcategories.")

    # 2. Parse Product translations
    prod_blocks = re.split(r'<a id="product-(\d+)"></a>', text)
    products_tr = {}

    for i in range(1, len(prod_blocks), 2):
        pid = prod_blocks[i]
        block = prod_blocks[i+1]

        ar_m = re.search(r'\*\*الاسم بالعربية:\*\* (.+)', block)
        en_m = re.search(r'\*\*English name:\*\* (.+)', block)
        fr_m = re.search(r'\*\*Nom français:\*\* (.+)', block)

        en_desc_m = re.search(r'### Description and details \(English\)\n+(.*?)(?=\n### Description et détails|\n---|\Z)', block, re.DOTALL)
        fr_desc_m = re.search(r'### Description et détails \(Français\)\n+(.*?)(?=\n### Options|\n---|\Z)', block, re.DOTALL)

        if ar_m and en_m and fr_m:
            ar_name = ar_m.group(1).strip()
            en_name = en_m.group(1).strip()
            fr_name = fr_m.group(1).strip()
            en_desc = clean_markdown_desc(en_desc_m.group(1).strip()) if en_desc_m else en_name
            fr_desc = clean_markdown_desc(fr_desc_m.group(1).strip()) if fr_desc_m else fr_name

            products_tr[ar_name] = {
                "pid": pid,
                "en_name": en_name,
                "fr_name": fr_name,
                "en_desc": en_desc,
                "fr_desc": fr_desc,
            }

    print(f"Loaded translations for {len(products_tr)} products.")

    # Connect to MongoDB
    print("Connecting to MongoDB Atlas...")
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=30000)
    db = client[DB_NAME]

    # 3. Update Categories in DB
    cat_updated = 0
    cat_id_to_name = {}
    for c in db.categories.find({}):
        ar_name = c.get("ar_name")
        cat_id_to_name[str(c["_id"])] = ar_name
        tr = categories_tr.get(ar_name)
        if tr:
            db.categories.update_one(
                {"_id": c["_id"]},
                {"$set": {"en_name": tr["en"], "fr_name": tr["fr"]}}
            )
            cat_updated += 1
            print(f"  ✅ Updated Category: {ar_name} -> EN: '{tr['en']}' | FR: '{tr['fr']}'")

    # 4. Update Subcategories in DB
    sub_updated = 0
    for s in db.subcategories.find({}):
        sub_ar = s.get("ar_name")
        parent_ar = cat_id_to_name.get(str(s.get("categoryId")))

        if sub_ar == "عام":
            db.subcategories.update_one(
                {"_id": s["_id"]},
                {"$set": {"en_name": "General", "fr_name": "Général"}}
            )
            sub_updated += 1
            print(f"  ✅ Updated Subcategory: عام -> EN: 'General' | FR: 'Général'")
            continue

        tr = subcategories_tr.get((parent_ar, sub_ar))
        if not tr:
            # Try matching by sub_ar alone
            for (p_ar, s_ar), val in subcategories_tr.items():
                if s_ar == sub_ar:
                    tr = val
                    break

        if tr:
            db.subcategories.update_one(
                {"_id": s["_id"]},
                {"$set": {"en_name": tr["en"], "fr_name": tr["fr"]}}
            )
            sub_updated += 1
            print(f"  ✅ Updated Subcategory: '{sub_ar}' -> EN: '{tr['en']}' | FR: '{tr['fr']}'")
        else:
            print(f"  ⚠️ Warning: Translation not found for subcategory '{sub_ar}' under '{parent_ar}'")

    # 5. Update Products in DB
    prod_updated = 0
    for p in db.products.find({}):
        ar_name = p.get("ar_name", "").strip()

        # Handle the special case where old DB had English title for PID 1685260828
        if ar_name == "4MP Motorized IR Dome Camera":
            ar_name = "كاميرا دوم متحركة بدقة 4 ميجابكسل مع أشعة تحت الحمراء"
            tr = products_tr.get(ar_name)
            if tr:
                db.products.update_one(
                    {"_id": p["_id"]},
                    {"$set": {
                        "ar_name": ar_name,
                        "en_name": tr["en_name"],
                        "fr_name": tr["fr_name"],
                        "en_description": tr["en_desc"],
                        "fr_description": tr["fr_desc"],
                    }}
                )
                prod_updated += 1
                print(f"  ✅ Updated Product [1685260828] -> EN: '{tr['en_name']}'")
                continue

        tr = products_tr.get(ar_name)
        if tr:
            db.products.update_one(
                {"_id": p["_id"]},
                {"$set": {
                    "en_name": tr["en_name"],
                    "fr_name": tr["fr_name"],
                    "en_description": tr["en_desc"],
                    "fr_description": tr["fr_desc"],
                }}
            )
            prod_updated += 1
            if prod_updated % 25 == 0 or prod_updated == len(products_tr):
                print(f"  Updated {prod_updated}/{len(products_tr)} products...")
        else:
            print(f"  ⚠️ Warning: Product not found in translations: '{ar_name}'")

    client.close()
    print("=" * 60)
    print("🎉 TRANSLATIONS UPDATE COMPLETED!")
    print(f"Categories updated: {cat_updated}")
    print(f"Subcategories updated: {sub_updated}")
    print(f"Products updated: {prod_updated}")
    print("=" * 60)


if __name__ == "__main__":
    main()

