import csv
import random
import os

COLUMNS = [
    "Handle", "Title", "Body (HTML)", "Description", "Vendor", "Custom Product Type", "Tags", "Published", 
    "Option1 Name", "Option1 Value", "Option2 Name", "Option2 Value", 
    "Option3 Name", "Option3 Value", "Variant SKU", "Variant Grams", 
    "Variant Inventory Policy", "Variant Inventory Qty", "Variant Price", 
    "Image Src", "Image Position", "Image Alt Text", "SEO Title", 
    "SEO Description", "Variant Image", "Variant Weight Unit", "Cost per item", 
    "Price / International", "Status", "Image URL 1", "Image URL 2", "Image URL 3", "Image URL 4", "Image URL 5"
]

BRANDS = ["Nike", "Adidas", "Puma", "Reebok", "Under Armour", "Apple", "Samsung", "Sony", "Logitech", "Razer"]
TYPES = ["Electronics", "Clothing", "Footwear", "Accessories", "Home Appliances"]
ADJECTIVES = ["Premium", "Classic", "Modern", "Ultra", "Lite", "Pro", "Max", "Essential", "Elite", "Basic"]

CLOTHING_ITEMS = ["T-Shirt", "Hoodie", "Jacket", "Jeans", "Shorts", "Sweater", "Sneakers", "Running Shoes", "Socks", "Cap"]
ELECTRONIC_ITEMS = ["Headphones", "Earbuds", "Smartwatch", "Speaker", "Power Bank", "Charger", "Cable", "Case", "Keyboard", "Mouse"]
HOME_ITEMS = ["Blender", "Coffee Maker", "Toaster", "Kettle", "Vacuum", "Lamp", "Fan", "Heater", "Clock", "Scale"]

def generate_product(index):
    category = random.choice([0, 1, 2])
    
    if category == 0:
        base_name = random.choice(CLOTHING_ITEMS)
        ptype = random.choice(["Clothing", "Footwear"])
        image_keyword = base_name.lower().replace(" ", ",")
    elif category == 1:
        base_name = random.choice(ELECTRONIC_ITEMS)
        ptype = "Electronics"
        image_keyword = "technology," + base_name.lower().replace(" ", ",")
    else:
        base_name = random.choice(HOME_ITEMS)
        ptype = "Home Appliances"
        image_keyword = "home," + base_name.lower().replace(" ", ",")
        
    adj = random.choice(ADJECTIVES)
    brand = random.choice(BRANDS)
    
    title = f"{brand} {adj} {base_name}"
    handle = title.lower().replace(" ", "-") + f"-{index}"
    sku = f"SKU-{brand[:3].upper()}-{index:04d}"
    
    price = round(random.uniform(999.0, 15999.0), -2) - 1 # 999 to 15999, ending in 99
    qty = random.randint(0, 150)
    
    # Using Unsplash source for real images
    # We append index to ensure unique images even for the same keyword
    image_url = f"https://source.unsplash.com/400x400/?{image_keyword}&sig={index}"
    
    # Adding commas inside the tags means they MUST be quoted by the CSV writer!
    return {
        "Handle": handle,
        "Title": title,
        "Body (HTML)": f"<p>Experience the quality of our latest <strong>{title}</strong>. Designed by {brand} for everyday use.</p>",
        "Description": f"Amazing high-quality {title} by {brand}.",
        "Vendor": brand,
        "Custom Product Type": ptype,
        "Tags": f"{ptype.lower()}, {brand.lower()}, premium, sale", # <-- This has commas
        "Published": "TRUE",
        "Option1 Name": "Color",
        "Option1 Value": random.choice(["Black", "White", "Navy", "Red", "Grey"]),
        "Option2 Name": "Size",
        "Option2 Value": random.choice(["S", "M", "L", "XL", "One Size"]),
        "Option3 Name": "",
        "Option3 Value": "",
        "Variant SKU": sku,
        "Variant Grams": random.randint(100, 2500),
        "Variant Inventory Policy": "deny",
        "Variant Inventory Qty": qty,
        "Variant Price": price,
        "Image Src": image_url,
        "Image Position": 1,
        "Image Alt Text": title,
        "SEO Title": f"Buy {title} Online - Best Price",
        "SEO Description": f"Get the {brand} {adj} {base_name} at the best price today. Available in multiple variants.",
        "Variant Image": image_url,
        "Variant Weight Unit": "g",
        "Cost per item": round(price * 0.6, 2),
        "Price / International": "",
        "Status": "active",
        "Image URL 1": image_url,
        "Image URL 2": "",
        "Image URL 3": "",
        "Image URL 4": "",
        "Image URL 5": ""
    }

def main():
    filename = "sample_products_100.csv"
    print(f"Generating {filename}...")
    
    # The csv module automatically quotes fields that contain the delimiter (,).
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        
        for i in range(1, 113):
            product = generate_product(i)
            writer.writerow(product)
            
    print("Done! CSV created successfully.")

if __name__ == "__main__":
    main()
