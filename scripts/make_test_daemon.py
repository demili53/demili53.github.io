import argparse
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RULES_PATH = os.path.join(ROOT, "rules", "make-test.md")
PLAN_PATH = os.path.join(ROOT, "rules", "make-test-plan.md")
LIST_PATH = os.path.join(ROOT, "brainTest", "pages", "list.json")
INDEX_PATH = os.path.join(ROOT, "index.html")
SITEMAP_PATH = os.path.join(ROOT, "sitemap.xml")
OUTPUT_DIR = os.path.join(ROOT, "brainTest", "pages", "brainTest")
IMAGES_DIR = os.path.join(ROOT, "brainTest", "images")
CONFIG_PATH = os.path.join(ROOT, "config", "make-test-daemon.json")
STATE_PATH = os.path.join(ROOT, "config", "make-test-daemon.state.json")


def read_text(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def write_text(path, content):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def load_json(path, default):
    if not os.path.exists(path):
        return default
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_config():
    defaults = {
        "interval_minutes": 1440,
        "max_per_run": 1,
        "model": "gpt-5-codex",
        "openai_base_url": "https://api.openai.com/v1/responses",
        "pixabay_api_key": "53761312-8e8e82ca5d56622afe4689c50",
        "temperature": 0.7,
    }
    config = load_json(CONFIG_PATH, defaults)
    for key, value in defaults.items():
        config.setdefault(key, value)
    return config


def load_state():
    return load_json(STATE_PATH, {"last_processed": 0, "processed": []})


def save_state(state):
    save_json(STATE_PATH, state)


def parse_plan(text):
    entries = []
    for line in text.splitlines():
        match = re.match(r"^\s*(\d{3})\s+(https?://\S+)\s*$", line)
        if match:
            entries.append((int(match.group(1)), match.group(2)))
    return entries


def fetch_url(url):
    req = urllib.request.Request(url, headers={"User-Agent": "codex-daemon/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


def extract_source_context(html):
    title = ""
    description = ""
    match = re.search(r"<title>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
    if match:
        title = re.sub(r"\s+", " ", match.group(1)).strip()
    next_data_match = re.search(
        r"<script id=\"__NEXT_DATA__\" type=\"application/json\">(.*?)</script>",
        html,
        re.DOTALL,
    )
    if next_data_match:
        try:
            data = json.loads(next_data_match.group(1))
            test = data.get("props", {}).get("pageProps", {}).get("test", {})
            title = test.get("title") or title
            description = test.get("description") or description
        except json.JSONDecodeError:
            pass
    description = re.sub(r"\s+", " ", description).strip()
    return {"title": title, "description": description}


def call_openai(config, guide, source_url, source_context):
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY environment variable is not set.")

    system_prompt = (
        "You are a coding assistant that outputs JSON only. "
        "Follow the guide strictly and return a JSON object matching the schema."
    )
    user_prompt = {
        "guide": guide,
        "source_url": source_url,
        "source_title": source_context.get("title"),
        "source_description": source_context.get("description"),
        "instructions": [
            "Create a new brain test as a single HTML file under /brainTest/pages/brainTest/.",
            "Return JSON with fields: meta, html, image_plan.",
            "meta: {id, title, path, description, keywords}",
            "html: full HTML string.",
            "image_plan: array of {filename, query} for images to download via Pixabay.",
            "Use at least 4 result types with compatibility section and links.",
            "Include Kakao share and adsense meta/script per guide.",
            "Do not copy text from the source; paraphrase and original content only.",
        ],
    }

    payload = {
        "model": config["model"],
        "input": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(user_prompt, ensure_ascii=False)},
        ],
        "temperature": config["temperature"],
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        config["openai_base_url"],
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        raw = resp.read().decode("utf-8")
    return parse_response(raw)


def parse_response(raw):
    data = json.loads(raw)
    parts = []
    for item in data.get("output", []):
        if item.get("type") == "message":
            for content in item.get("content", []):
                if content.get("type") == "output_text":
                    parts.append(content.get("text", ""))
    text = "\n".join(parts).strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\n", "", text)
        text = re.sub(r"\n```$", "", text).strip()
    return json.loads(text)


def ensure_images(config, image_plan):
    if not image_plan:
        return
    for item in image_plan:
        filename = item.get("filename")
        query = item.get("query")
        if not filename or not query:
            continue
        dest_path = os.path.join(IMAGES_DIR, filename)
        if os.path.exists(dest_path):
            continue
        download_pixabay_image(config, query, dest_path)


def download_pixabay_image(config, query, dest_path):
    key = config["pixabay_api_key"]
    encoded = urllib.parse.quote(query)
    url = (
        f"https://pixabay.com/api/?key={key}&q={encoded}"
        "&image_type=photo&orientation=horizontal&safesearch=true&per_page=3"
    )
    data = json.loads(fetch_url(url))
    hits = data.get("hits", [])
    if not hits:
        raise RuntimeError(f"No Pixabay hits for query: {query}")
    image_url = hits[0].get("webformatURL")
    if not image_url:
        raise RuntimeError(f"No image URL for query: {query}")
    urllib.request.urlretrieve(image_url, dest_path)


def write_test_file(meta, html):
    filename = f"{meta['id']}.html"
    path = os.path.join(OUTPUT_DIR, filename)
    write_text(path, html)


def update_list_json(meta):
    data = load_json(LIST_PATH, [])
    if any(item.get("id") == meta["id"] for item in data):
        return
    data.append(
        {
            "id": meta["id"],
            "title": meta["title"],
            "path": meta["path"],
            "description": meta["description"],
            "keywords": meta.get("keywords", []),
        }
    )
    save_json(LIST_PATH, data)


def update_index_html(meta):
    content = read_text(INDEX_PATH)
    match = re.search(
        r"(<script id=\"testListData\" type=\"application/json\">)(.*?)(</script>)",
        content,
        re.DOTALL,
    )
    if not match:
        raise RuntimeError("Could not find testListData JSON in index.html")
    data = json.loads(match.group(2))
    if any(item.get("id") == meta["id"] for item in data):
        return
    data.append(
        {
            "id": meta["id"],
            "title": meta["title"],
            "path": meta["path"],
            "description": meta["description"],
            "keywords": meta.get("keywords", []),
        }
    )
    rendered = render_inline_json(data)
    updated = content[: match.start(2)] + rendered + content[match.end(2) :]
    write_text(INDEX_PATH, updated)


def render_inline_json(data):
    lines = ["["]
    for idx, item in enumerate(data):
        line = json.dumps(item, ensure_ascii=False, separators=(",", ":"))
        prefix = "  "
        if idx < len(data) - 1:
            lines.append(f"{prefix}{line},")
        else:
            lines.append(f"{prefix}{line}")
    lines.append("]")
    return "\n".join(lines)


def update_sitemap(meta):
    content = read_text(SITEMAP_PATH)
    if meta["path"] in content:
        return
    entry = (
        "  <url>\n"
        f"    <loc>https://partygame.pe.kr{meta['path']}</loc>\n"
        "    <changefreq>weekly</changefreq>\n"
        "    <priority>0.8</priority>\n"
        "  </url>\n"
    )
    updated = content.replace("</urlset>", f"{entry}</urlset>")
    write_text(SITEMAP_PATH, updated)


def run_once(config):
    guide = read_text(RULES_PATH)
    plan = parse_plan(read_text(PLAN_PATH))
    if not plan:
        print("No entries found in make-test-plan.md")
        return

    state = load_state()
    last_processed = state.get("last_processed", 0)
    remaining = [item for item in plan if item[0] > last_processed]
    if not remaining:
        print("No remaining entries to process.")
        return

    to_process = remaining[: config["max_per_run"]]
    for number, url in to_process:
        print(f"Processing {number} {url}")
        try:
            html = fetch_url(url)
            source_context = extract_source_context(html)
            result = call_openai(config, guide, url, source_context)
            meta = result["meta"]
            html_out = result["html"]
            image_plan = result.get("image_plan", [])
            ensure_images(config, image_plan)
            write_test_file(meta, html_out)
            update_list_json(meta)
            update_index_html(meta)
            update_sitemap(meta)
            state["last_processed"] = number
            state.setdefault("processed", []).append(
                {"number": number, "url": url, "id": meta["id"], "ts": datetime.utcnow().isoformat()}
            )
            save_state(state)
            print(f"Completed {meta['id']}")
        except (urllib.error.URLError, json.JSONDecodeError, RuntimeError, KeyError) as err:
            print(f"Error processing {number}: {err}")
            break


def run_daemon(config):
    interval = max(1, int(config["interval_minutes"])) * 60
    while True:
        run_once(config)
        print(f"Sleeping for {config['interval_minutes']} minutes...")
        time.sleep(interval)


def main():
    parser = argparse.ArgumentParser(description="Codex make-test daemon")
    parser.add_argument("--once", action="store_true", help="Run a single cycle and exit")
    args = parser.parse_args()

    config = load_config()
    if args.once:
        run_once(config)
    else:
        run_daemon(config)


if __name__ == "__main__":
    main()
