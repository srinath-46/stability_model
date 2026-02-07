import pandas as pd
import numpy as np
import random

# --- CONFIGURATION ---
PRODUCT_CATALOG = {
    "Heavy Load": [
        "Industrial Motor",
        "Steel Beam",
        "Car Engine",
        "Gym Weights",
        "Concrete Block",
        "Generator",
        "Safe Box",
        "Anvil",
    ],
    "Fragile": [
        "Glass Vase",
        "Ceramic Plates",
        "Monitor",
        "Mirror",
        "Laboratory Beaker",
        "Antique Lamp",
        "Wine Bottles",
        "TV Screen",
    ],
    "Common": [
        "Books",
        "Shoes",
        "Plastic Toys",
        "Canned Food",
        "Clothes",
        "Tools",
        "Paper Ream",
        "Cushions",
    ],
}


def get_random_product():
    category = random.choice(list(PRODUCT_CATALOG.keys()))
    name = random.choice(PRODUCT_CATALOG[category])

    # Assign realistic weights based on category
    if category == "Heavy Load":
        weight = np.random.randint(30, 80)  # 30-80kg
    elif category == "Fragile":
        weight = np.random.randint(1, 15)  # 1-15kg
    else:  # Common
        weight = np.random.randint(2, 30)  # 2-30kg

    return name, category, weight


def generate_physics_aware_data(samples=50000):
    print(f"🚀 Generating {samples} samples with Product Data...")

    data_priority = []
    data_stability = []

    for _ in range(samples):
        # --- 1. GENERATE RANDOM PRODUCT ---
        name, category, weight = get_random_product()
        l, w, h = np.random.randint(10, 60, 3)  # Dimensions
        volume = l * w * h
        base_area = l * w

        # --- TASK A: PRIORITY DATA (Updated for Category) ---
        # Logic: Heavy items first. Fragile items LAST (lowest priority).

        raw_score = (weight * 0.6) + (base_area / 100 * 0.4)

        # Category Modifiers
        if category == "Heavy Load":
            raw_score += 50  # Huge bonus to ensure they go first
        elif category == "Fragile":
            raw_score = 0  # Force to 0 (pack last/on top)

        # Normalize to 0-10
        priority_score = min(10, max(0, raw_score / 10))

        # We save numeric representations for Category so AI can learn it
        # Common=0, Fragile=1, Heavy=2
        cat_code = 0
        if category == "Fragile":
            cat_code = 1
        if category == "Heavy Load":
            cat_code = 2

        data_priority.append(
            [name, category, cat_code, l, w, h, weight, priority_score]
        )

        # --- TASK B: STABILITY DATA ---
        # (Same physics logic as before, but using realistic weights)

        # Item 1 (Bottom - Random)
        _, _, b_weight = get_random_product()
        bl, bw, bh = np.random.randint(20, 70, 3)

        # Item 2 (Top - The one we just generated)
        # weight is already set above

        # Physics Calculation
        overlap_factor = random.uniform(0.4, 1.0)
        support_area = min(bl, l) * min(bw, w) * overlap_factor
        support_ratio = support_area / (l * w)
        weight_ratio = weight / b_weight

        stability_score = 1.0
        if support_ratio < 0.70:
            stability_score -= 0.6
        if weight_ratio > 1.5:
            stability_score -= 0.3

        # Fragile items are inherently less "structurally stable" if used as a base
        # (We don't want to stack ON TOP of fragile items)
        # But this dataset predicts if the CURRENT placement is stable.

        stability_score = max(0, min(1, stability_score))

        data_stability.append([l, w, h, weight, bl, bw, b_weight, stability_score])

    # --- SAVE TO CSV ---
    cols_p = ["name", "category", "cat_code", "l", "w", "h", "weight", "score"]
    df_p = pd.DataFrame(data_priority, columns=cols_p)
    df_p.to_csv("training_priority.csv", index=False)

    cols_s = ["l", "w", "h", "weight", "bl", "bw", "bweight", "score"]
    df_s = pd.DataFrame(data_stability, columns=cols_s)
    df_s.to_csv("training_stability.csv", index=False)

    print("✅ SUCCESS!")
    print(f"   - Priority Data: {len(df_p)} samples (Added Name & Category)")
    print(f"   - Stability Data: {len(df_s)} samples")


if __name__ == "__main__":
    generate_physics_aware_data(samples=50000)
