#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MERAKI_PATH = ROOT / "tmp-meraki-all.json"
OUT_PATH = ROOT / "src" / "app" / "core" / "data" / "champion-combat.ts"
MERAKI_URL = "https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions.json"
CDRAGON_ZH = (
    "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/"
    "global/zh_tw/v1/champions/{key}.json"
)

DAMAGE_ATTR = re.compile(r"(physical|magic|true)?\s*damage", re.I)


def load_meraki() -> dict:
    if MERAKI_PATH.exists() and MERAKI_PATH.stat().st_size > 1_000_000:
        return json.loads(MERAKI_PATH.read_text())
    print("downloading meraki champions…")
    with urllib.request.urlopen(MERAKI_URL, timeout=120) as res:
        data = res.read()
    MERAKI_PATH.write_bytes(data)
    return json.loads(data)


def flat_values(node) -> list[float]:
    if not node:
        return []
    mods = node.get("modifiers") if isinstance(node, dict) else None
    if not mods:
        return []
    values = mods[0].get("values") or []
    return [float(v) for v in values]


def first_values(node) -> list[float]:
    return flat_values(node)


def parse_damage(form: dict) -> dict:
    damage_type = (form.get("damageType") or "OTHER").upper()
    mapped = "physical"
    if "MAGIC" in damage_type:
        mapped = "magic"
    elif "TRUE" in damage_type:
        mapped = "true"
    elif "MIXED" in damage_type:
        mapped = "magic"

    base_values: list[float] = []
    ad_ratio = 0.0
    bonus_ad_ratio = 0.0
    ap_ratio = 0.0

    for effect in form.get("effects") or []:
        for leveling in effect.get("leveling") or []:
            attr = str(leveling.get("attribute") or "")
            if not DAMAGE_ATTR.search(attr):
                continue
            if "modifier" in attr.lower() and not base_values:
                continue
            for mod in leveling.get("modifiers") or []:
                values = [float(v) for v in (mod.get("values") or [])]
                units = mod.get("units") or [""] * len(values)
                unit = (units[0] if units else "").lower()
                if not values:
                    continue
                if unit in ("", "flat"):
                    if not base_values:
                        base_values = values
                elif "% ad" == unit or unit.endswith("% ad"):
                    ad_ratio = max(ad_ratio, values[0] / 100.0)
                elif "bonus ad" in unit:
                    bonus_ad_ratio = max(bonus_ad_ratio, values[0] / 100.0)
                elif "% ap" in unit or unit.endswith("% ap"):
                    ap_ratio = max(ap_ratio, values[0] / 100.0)
            if base_values:
                break
        if base_values:
            break

    damage_base = base_values[0] if base_values else 0.0
    damage_per_level = (
        (base_values[1] - base_values[0]) if len(base_values) > 1 else 0.0
    )
    return {
        "damageType": mapped,
        "damageBase": round(damage_base, 2),
        "damagePerLevel": round(damage_per_level, 2),
        "damageByRank": [round(v, 2) for v in base_values] if base_values else [],
        "adRatio": round(ad_ratio, 4),
        "bonusAdRatio": round(bonus_ad_ratio, 4),
        "apRatio": round(ap_ratio, 4),
    }


def tags_for(form: dict, slot: str, damage: dict) -> list[str]:
    tags: list[str] = []
    if slot == "P":
        tags.append("passive")
        return tags
    if damage["damageBase"] > 0 or damage["adRatio"] or damage["apRatio"] or damage["bonusAdRatio"]:
        tags.append("damage")
    targeting = (form.get("targeting") or "").upper()
    if targeting in ("DIRECTION", "LOCATION"):
        tags.append("skillshot")
    if slot == "R":
        tags.append("ultimate")
    if "utility" not in tags and damage["damageBase"] <= 0 and slot != "R":
        tags.append("utility")
    if not tags:
        tags.append("utility")
    return tags


def build_ability(slot: str, forms: list, zh_name: str | None) -> dict:
    form = forms[0] if forms else {}
    cooldown = first_values(form.get("cooldown"))
    cost = first_values(form.get("cost"))
    # Meraki rarely exposes range as modifiers; keep sensible defaults later.
    damage = parse_damage(form)
    max_rank = max(len(cooldown), len(cost), len(damage["damageByRank"]), 1 if slot == "P" else 5)
    if slot == "R" and max_rank < 3:
        max_rank = 3
    if slot == "P":
        max_rank = 1
    name = form.get("name") or f"{slot}"
    description = ""
    for effect in form.get("effects") or []:
        description = effect.get("description") or ""
        if description:
            break
    icon = form.get("icon") or f"https://cdn.communitydragon.org/latest/champion/Aatrox/ability-icon/{slot.lower()}"
    return {
        "slot": slot,
        "name": name,
        "nameZh": zh_name or name,
        "iconUrl": icon,
        "description": description[:280],
        "maxRank": max_rank,
        "cooldownSec": cooldown[0] if cooldown else (0 if slot == "P" else 8),
        "manaCost": cost[0] if cost else 0,
        "range": 625 if slot != "P" else 0,
        "cooldownByRank": cooldown,
        "manaCostByRank": cost,
        **damage,
        "tags": tags_for(form, slot, damage),
    }


def fetch_json(url: str) -> dict | list | None:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "lol-universe-import/1.0",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            return json.loads(res.read().decode("utf-8"))
    except Exception:
        return None


def fetch_zh(champ_id: str, key: int) -> dict[str, str]:
    out: dict[str, str] = {}
    cdragon = fetch_json(CDRAGON_ZH.format(key=key))
    if isinstance(cdragon, dict):
        passive = cdragon.get("passive") or {}
        if passive.get("name"):
            out["P"] = passive["name"]
        for spell in cdragon.get("spells") or []:
            slot = (spell.get("spellKey") or "").upper()
            if slot in ("Q", "W", "E", "R") and spell.get("name"):
                out[slot] = spell["name"]
        if out:
            return out

    ddragon = fetch_json(
        f"https://ddragon.leagueoflegends.com/cdn/14.24.1/data/zh_TW/champion/{champ_id}.json"
    )
    if not isinstance(ddragon, dict):
        return out
    champ = (ddragon.get("data") or {}).get(champ_id) or {}
    passive = champ.get("passive") or {}
    if passive.get("name"):
        out["P"] = passive["name"]
    for idx, slot in enumerate(("Q", "W", "E", "R")):
        spells = champ.get("spells") or []
        if idx < len(spells) and spells[idx].get("name"):
            out[slot] = spells[idx]["name"]
    return out


def stat(node: dict, key: str, field: str) -> float:
    block = (node.get("stats") or {}).get(key) or {}
    return float(block.get(field) or 0)


def build_champ(champ_id: str, raw: dict, zh_map: dict[str, str]) -> dict:
    abilities = []
    for slot in ("P", "Q", "W", "E", "R"):
        forms = (raw.get("abilities") or {}).get(slot) or []
        abilities.append(build_ability(slot, forms, zh_map.get(slot)))
    attack_type = (raw.get("attackType") or "MELEE").upper()
    return {
        "id": champ_id,
        "name": raw.get("name") or champ_id,
        "resource": raw.get("resource") or "MANA",
        "attackType": attack_type,
        "adaptiveType": raw.get("adaptiveType") or "PHYSICAL_DAMAGE",
        "baseHp": round(stat(raw, "health", "flat"), 2),
        "hpPerLevel": round(stat(raw, "health", "perLevel"), 2),
        "baseHpRegen": round(stat(raw, "healthRegen", "flat"), 4),
        "hpRegenPerLevel": round(stat(raw, "healthRegen", "perLevel"), 4),
        "baseMana": round(stat(raw, "mana", "flat"), 2),
        "manaPerLevel": round(stat(raw, "mana", "perLevel"), 2),
        "baseManaRegen": round(stat(raw, "manaRegen", "flat"), 4),
        "manaRegenPerLevel": round(stat(raw, "manaRegen", "perLevel"), 4),
        "baseAd": round(stat(raw, "attackDamage", "flat"), 2),
        "adPerLevel": round(stat(raw, "attackDamage", "perLevel"), 2),
        "baseArmor": round(stat(raw, "armor", "flat"), 2),
        "armorPerLevel": round(stat(raw, "armor", "perLevel"), 2),
        "baseMr": round(stat(raw, "magicResistance", "flat"), 2),
        "mrPerLevel": round(stat(raw, "magicResistance", "perLevel"), 2),
        "moveSpeed": round(stat(raw, "movespeed", "flat"), 2),
        "attackRange": round(stat(raw, "attackRange", "flat"), 2),
        "attackSpeed": round(stat(raw, "attackSpeed", "flat"), 4),
        "attackSpeedPerLevel": round(stat(raw, "attackSpeed", "perLevel"), 4),
        "abilities": abilities,
    }


def main() -> None:
    meraki = load_meraki()
    rows = []
    for champ_id in sorted(meraki.keys()):
        raw = meraki[champ_id]
        numeric_id = int(raw.get("id") or 0)
        print(f"import {champ_id} ({numeric_id})")
        zh_map = fetch_zh(champ_id, numeric_id) if numeric_id else {}
        rows.append(build_champ(champ_id, raw, zh_map))

    payload = json.dumps(rows, ensure_ascii=False, indent=2)
    content = (
        "/* eslint-disable */\n"
        "// Auto-generated by scripts/import-champion-combat.py — do not edit by hand.\n"
        "export type CombatDamageType = 'physical' | 'magic' | 'true';\n"
        "\n"
        "export interface ChampionAbilityCombatData {\n"
        "  slot: 'P' | 'Q' | 'W' | 'E' | 'R';\n"
        "  name: string;\n"
        "  nameZh: string;\n"
        "  iconUrl: string;\n"
        "  description: string;\n"
        "  maxRank: number;\n"
        "  cooldownSec: number;\n"
        "  manaCost: number;\n"
        "  range: number;\n"
        "  cooldownByRank: number[];\n"
        "  manaCostByRank: number[];\n"
        "  damageType: CombatDamageType;\n"
        "  damageBase: number;\n"
        "  damagePerLevel: number;\n"
        "  damageByRank: number[];\n"
        "  adRatio: number;\n"
        "  bonusAdRatio: number;\n"
        "  apRatio: number;\n"
        "  tags: string[];\n"
        "}\n"
        "\n"
        "export interface ChampionCombatData {\n"
        "  id: string;\n"
        "  name: string;\n"
        "  resource: string;\n"
        "  attackType: string;\n"
        "  adaptiveType: string;\n"
        "  baseHp: number;\n"
        "  hpPerLevel: number;\n"
        "  baseHpRegen: number;\n"
        "  hpRegenPerLevel: number;\n"
        "  baseMana: number;\n"
        "  manaPerLevel: number;\n"
        "  baseManaRegen: number;\n"
        "  manaRegenPerLevel: number;\n"
        "  baseAd: number;\n"
        "  adPerLevel: number;\n"
        "  baseArmor: number;\n"
        "  armorPerLevel: number;\n"
        "  baseMr: number;\n"
        "  mrPerLevel: number;\n"
        "  moveSpeed: number;\n"
        "  attackRange: number;\n"
        "  attackSpeed: number;\n"
        "  attackSpeedPerLevel: number;\n"
        "  abilities: ChampionAbilityCombatData[];\n"
        "}\n"
        "\n"
        f"export const CHAMPION_COMBAT: readonly ChampionCombatData[] = {payload} as const;\n"
        "\n"
        "export const CHAMPION_COMBAT_BY_ID: Readonly<Record<string, ChampionCombatData>> =\n"
        "  Object.fromEntries(CHAMPION_COMBAT.map((champ) => [champ.id, champ]));\n"
    )
    OUT_PATH.write_text(content)
    print(f"wrote {OUT_PATH} ({len(rows)} champions)")


if __name__ == "__main__":
    main()
