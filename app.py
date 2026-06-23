"""
Backend API для информационного ресурса 'Экология и мир'
Включает данные о заповедниках Республики Беларусь и базу данных
для хранения информации о животных и бронированиях домиков.
"""

from flask import Flask, jsonify, request, send_from_directory, redirect
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import sqlite3
from datetime import datetime
from typing import Optional
import urllib.parse
import urllib.request
import json
import re
import hashlib
import secrets
import time
from dotenv import load_dotenv

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")
CORS(app, resources={r"/*": {"origins": FRONTEND_URL}})

DB_PATH = os.path.join(BASE_DIR, "ecology.db")
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads", "avatars")
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

# Создаем папку для загрузок, если её нет
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5 MB max

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:5001").rstrip("/")
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "").strip()
VK_CLIENT_ID = os.environ.get("VK_CLIENT_ID", "").strip()
VK_CLIENT_SECRET = os.environ.get("VK_CLIENT_SECRET", "").strip()
GITHUB_CLIENT_ID = os.environ.get("GITHUB_CLIENT_ID", "").strip()
GITHUB_CLIENT_SECRET = os.environ.get("GITHUB_CLIENT_SECRET", "").strip()

# Временное хранение OAuth состояния и одноразовых кодов результата.
OAUTH_STATE_STORE: dict[str, dict] = {}
OAUTH_RESULT_STORE: dict[str, dict] = {}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def hash_password(password: str) -> tuple[str, str]:
    """Вернуть (salt, hash) для пароля."""
    salt = secrets.token_hex(16)
    h = hashlib.sha256((salt + password).encode("utf-8")).hexdigest()
    return salt, h


def verify_password(password: str, salt: str, stored_hash: str) -> bool:
    """Проверить пароль по соли и сохранённому хэшу."""
    candidate = hashlib.sha256((salt + password).encode("utf-8")).hexdigest()
    return secrets.compare_digest(candidate, stored_hash)


def build_user_payload(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "favorite_reserve_id": row["favorite_reserve_id"],
        "is_admin": bool(row["is_admin"]),
    }


def _cleanup_oauth_stores() -> None:
    now = time.time()
    for key in list(OAUTH_STATE_STORE.keys()):
        if now - OAUTH_STATE_STORE[key].get("created_at", now) > 600:
            OAUTH_STATE_STORE.pop(key, None)
    for key in list(OAUTH_RESULT_STORE.keys()):
        if now - OAUTH_RESULT_STORE[key].get("created_at", now) > 600:
            OAUTH_RESULT_STORE.pop(key, None)


def _http_json(url: str, method: str = "GET", data: Optional[dict] = None, headers: Optional[dict] = None) -> dict:
    payload = None
    req_headers = headers.copy() if headers else {}
    if data is not None:
        if req_headers.get("Content-Type") == "application/x-www-form-urlencoded":
            payload = urllib.parse.urlencode(data).encode("utf-8")
        else:
            req_headers["Content-Type"] = "application/json"
            payload = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=payload, method=method, headers=req_headers)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _get_or_create_oauth_user(provider: str, provider_user_id: str, email: str, name: str) -> dict:
    """Найти или создать пользователя по OAuth провайдеру/email."""
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT id, name, email, favorite_reserve_id, is_admin
        FROM users
        WHERE oauth_provider = ? AND oauth_provider_user_id = ?
        """,
        (provider, provider_user_id),
    )
    row = cur.fetchone()

    if not row and email:
        cur.execute(
            """
            SELECT id, name, email, favorite_reserve_id, is_admin
            FROM users
            WHERE email = ?
            """,
            (email,),
        )
        row = cur.fetchone()
        if row:
            cur.execute(
                """
                UPDATE users
                SET oauth_provider = ?, oauth_provider_user_id = ?
                WHERE id = ?
                """,
                (provider, provider_user_id, row["id"]),
            )
            conn.commit()

    if row:
        conn.close()
        return build_user_payload(row)

    salt, pwd_hash = hash_password(secrets.token_urlsafe(24))
    created_name = (name or email.split("@")[0] or "User").strip()[:120]
    cur.execute(
        """
        INSERT INTO users (
            name, email, password_salt, password_hash, created_at, oauth_provider, oauth_provider_user_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            created_name,
            email,
            salt,
            pwd_hash,
            datetime.utcnow().isoformat(),
            provider,
            provider_user_id,
        ),
    )
    user_id = cur.lastrowid
    cur.execute(
        """
        SELECT id, name, email, favorite_reserve_id, is_admin
        FROM users
        WHERE id = ?
        """,
        (user_id,),
    )
    row = cur.fetchone()
    conn.commit()
    conn.close()
    return build_user_payload(row)


def fetch_wikipedia_summary(title: str) -> Optional[str]:
    """Получить краткое описание сущности из русской Википедии."""
    try:
        base_url = "https://ru.wikipedia.org/api/rest_v1/page/summary/{}"
        url = base_url.format(urllib.parse.quote(title))
        with urllib.request.urlopen(url, timeout=5) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                extract = data.get("extract")
                if extract:
                    # Ограничиваем длину, чтобы описание оставалось компактным
                    return extract[:800]
    except Exception:
        # В случае любой ошибки просто вернем None, чтобы не ломать сервис
        return None
    return None


def seed_animals_from_web(cur: sqlite3.Cursor) -> None:
    """
    Заполнить таблицу animals, получая описания видов с русской Википедии.
    Список видов (название и латинское название) определен вручную,
    а текст описания подгружается из сети.
    """
    animals_meta = [
        # Беловежская пуща
        (1, "Европейский зубр", "Bison bonasus"),
        (1, "Бурый медведь", "Ursus arctos"),
        (1, "Чёрный аист", "Ciconia nigra"),
        (1, "Рысь евроазиатская", "Lynx lynx"),
        (1, "Европейская косуля", "Capreolus capreolus"),
        (1, "Благородный олень", "Cervus elaphus"),
        (1, "Кабан дикий", "Sus scrofa"),
        (1, "Волк обыкновенный", "Canis lupus"),
        (1, "Барсук европейский", "Meles meles"),
        (1, "Лесная куница", "Martes martes"),
        (1, "Орлан-белохвост", "Haliaeetus albicilla"),
        (1, "Змееяд", "Circaetus gallicus"),
        # Березинский биосферный заповедник
        (2, "Бобр речной", "Castor fiber"),
        (2, "Рысь обыкновенная", "Lynx lynx"),
        (2, "Большой подорлик", "Clanga clanga"),
        (2, "Американская норка", "Neovison vison"),
        (2, "Глухарь обыкновенный", "Tetrao urogallus"),
        (2, "Выдра речная", "Lutra lutra"),
        (2, "Лось", "Alces alces"),
        (2, "Тетерев", "Lyrurus tetrix"),
        (2, "Серый журавль", "Grus grus"),
        (2, "Чёрный аист", "Ciconia nigra"),
        (2, "Беркут", "Aquila chrysaetos"),
        (2, "Филин", "Bubo bubo"),
        # Припятский национальный парк
        (3, "Лось", "Alces alces"),
        (3, "Выдра речная", "Lutra lutra"),
        (3, "Серая цапля", "Ardea cinerea"),
        (3, "Бобр речной", "Castor fiber"),
        (3, "Большая выпь", "Botaurus stellaris"),
        (3, "Кабан дикий", "Sus scrofa"),
        (3, "Европейская косуля", "Capreolus capreolus"),
        (3, "Орлан-белохвост", "Haliaeetus albicilla"),
        (3, "Чёрный коршун", "Milvus migrans"),
        (3, "Болотная сова", "Asio flammeus"),
        (3, "Серый журавль", "Grus grus"),
        (3, "Большой кроншнеп", "Numenius arquata"),
        # Нарочанский национальный парк
        (4, "Судак", "Sander lucioperca"),
        (4, "Щука обыкновенная", "Esox lucius"),
        (4, "Большой крохаль", "Mergus merganser"),
        (4, "Обыкновенная гагара", "Gavia arctica"),
        (4, "Чомга", "Podiceps cristatus"),
        (4, "Лебедь-шипун", "Cygnus olor"),
        (4, "Серая утка", "Anas strepera"),
        (4, "Европейский угорь", "Anguilla anguilla"),
        (4, "Налим", "Lota lota"),
        (4, "Линь", "Tinca tinca"),
        (4, "Бобр речной", "Castor fiber"),
        (4, "Выдра речная", "Lutra lutra"),
        # Браславские озера
        (5, "Окунь речной", "Perca fluviatilis"),
        (5, "Большая поганка", "Podiceps cristatus"),
        (5, "Бобр речной", "Castor fiber"),
        (5, "Щука обыкновенная", "Esox lucius"),
        (5, "Чёрный аист", "Ciconia nigra"),
        (5, "Лебедь-кликун", "Cygnus cygnus"),
        (5, "Скопа", "Pandion haliaetus"),
        (5, "Орлан-белохвост", "Haliaeetus albicilla"),
        (5, "Сом обыкновенный", "Silurus glanis"),
        (5, "Лещ", "Abramis brama"),
        (5, "Судак", "Sander lucioperca"),
        (5, "Выдра речная", "Lutra lutra"),
        # Полесский радиационно-экологический заповедник
        (6, "Волк обыкновенный", "Canis lupus"),
        (6, "Кабан дикий", "Sus scrofa"),
        (6, "Орлан-белохвост", "Haliaeetus albicilla"),
        (6, "Рысь евроазиатская", "Lynx lynx"),
        (6, "Бурый медведь", "Ursus arctos"),
        (6, "Лось", "Alces alces"),
        (6, "Европейская косуля", "Capreolus capreolus"),
        (6, "Благородный олень", "Cervus elaphus"),
        (6, "Бобр речной", "Castor fiber"),
        (6, "Выдра речная", "Lutra lutra"),
        (6, "Чёрный аист", "Ciconia nigra"),
        (6, "Серый журавль", "Grus grus"),
    ]

    for reserve_id, name, species in animals_meta:
        description = fetch_wikipedia_summary(name)
        cur.execute(
            "INSERT INTO animals (reserve_id, name, species, description) VALUES (?, ?, ?, ?)",
            (reserve_id, name, species, description),
        )


OFFICIAL_SITE_URLS = {
    1: "https://npbp.by/",
    2: "https://berezinsky.by/",
    3: "https://www.npp.by/",
    4: "https://narochpark.by/",
    5: "https://braslavpark.by/",
    6: "https://zapovednik.by/",
}


def fetch_page_title(url: str) -> Optional[str]:
    """Вернуть заголовок HTML-страницы (тег <title>) по указанному URL."""
    try:
        with urllib.request.urlopen(url, timeout=5) as resp:
            if resp.status == 200:
                html = resp.read().decode("utf-8", errors="ignore")
                match = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
                if match:
                    return match.group(1).strip()
    except Exception:
        return None
    return None


def seed_cabins_from_web(cur: sqlite3.Cursor) -> None:
    """
    Заполнить таблицу cabins.
    Для каждого заповедника используется официальный сайт как источник информации;
    в БД сохраняется ссылка и заголовок страницы как описание.
    Вместимость и ориентировочная цена указываются как примерные значения.
    """
    base_cabins = {
        1: [
            {"name": "Гостевые домики Беловежской пущи", "capacity": 4, "price_per_night": 120, "image": "https://ironwood.by/wp-content/uploads/2025/07/photo_41_2025-07-11_09-49-01.jpg", "description": "Уютный гостевой домик в сердце древней Беловежской пущи. Комфортабельный дом для семейного отдыха с современными удобствами. Идеальное место для знакомства с уникальной природой заповедника и встречи с зубрами."},
            {"name": "Эко-шале Беловежской пущи", "capacity": 6, "price_per_night": 180, "image": "https://ironwood.by/wp-content/uploads/2025/07/photo_35_2025-07-11_09-49-01.jpg", "description": "Элегантное эко-шале премиум-класса в Беловежской пуще. Просторный дом с панорамными окнами, камином и террасой. Современный комфорт в гармонии с дикой природой. Подходит для компании до 6 человек."},
        ],
        2: [
            {"name": "Гостевые дома Березинского заповедника", "capacity": 3, "price_per_night": 90, "image": "https://berezinsky.by/wp-content/uploads/2024/08/plavno8-5-1.webp", "description": "Традиционный гостевой дом в Березинском заповеднике. Деревянный дом в экологически чистом районе среди лесов и озёр. Аутентичная атмосфера белорусской природы с всеми необходимыми удобствами для комфортного проживания."},
        ],
        3: [
            {"name": "Домики Припятского национального парка", "capacity": 5, "price_per_night": 140, "image": "https://avatars.mds.yandex.net/i?id=3940079f1cea4ee226e8c5db768c21cf76f9b7a3-5206291-images-thumbs&n=13", "description": "Комфортабельные домики в Припятском национальном парке. Расположены в сердце уникальных болотных массивов. Отличная возможность наблюдать за редкими птицами и животными в их естественной среде обитания."},
        ],
        4: [
            {"name": "Домики у озера Нарочь", "capacity": 4, "price_per_night": 150, "image": "https://narochpark.by/wp-content/uploads/2021/08/DSC8041-1536x1025.jpg", "description": "Живописные домики у озера Нарочь. Идеальное место для расслабляющего отдыха среди девственной природы. Чистый воздух, кристальная вода и красивые пейзажи ждут вас."},
        ],
        5: [
            {"name": "Домики в парке «Браславские озёра»", "capacity": 4, "price_per_night": 130, "image": "https://static.sutochno.ru/doc/files/objects/1/752/765/1020x690/675730cd1ac00.jpg", "description": "Домики в Браславском парке озёр. Расположены среди красивых озёр Браславского региона. Идеально для рыбалки, катания на лодках и наслаждения потрясающими пейзажами."},
        ],
        6: [
            {"name": "Гостевые домики Полесского заповедника", "capacity": 2, "price_per_night": 80, "image": "https://www.npp.by/upload/resize_cache/iblock/379/410_280_2/37935df927d1737b45650f25ae2b7c9e.jpg", "description": "Гостевые домики в Полесском заповеднике. Деревянные дома в нетронутой дикой природе Полесья. Уникальная возможность познакомиться с нетронутой природой региона."},
        ],
    }

    for reserve_id, cabins in base_cabins.items():
        source_url = OFFICIAL_SITE_URLS.get(reserve_id)
        title = fetch_page_title(source_url) if source_url else None

        for cabin in cabins:
            # Use the description from cabin data if provided, otherwise generate from web
            description = cabin.get("description")
            if not description:
                description_parts = []
                if title:
                    description_parts.append(title)
                if source_url:
                    description_parts.append(f"Подробнее о размещении и домиках: {source_url}")
                description = " — ".join(description_parts) if description_parts else None

            cur.execute(
                """
                INSERT INTO cabins (reserve_id, name, description, capacity, price_per_night, source_url, image)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    reserve_id,
                    cabin["name"],
                    description,
                    cabin.get("capacity"),
                    cabin.get("price_per_night"),
                    source_url,
                    cabin.get("image"),
                ),
            )

def seed_ecology_topics(cur):
    """Заполнить таблицу тем экологии начальными данными."""
    topics = [
        ("importance", "🌍", "Важность экологии", "Importance of ecology",
         "Почему экология важна для человечества", "Why ecology is important for humanity",
         "Экология — это наука о взаимодействии живых организмов между собой и с окружающей их средой. В современном мире экология приобрела особое значение, так как деятельность человека оказывает все большее влияние на природные процессы.\nЭкологические проблемы затрагивают каждого из нас. Загрязнение воздуха, воды и почвы, изменение климата, исчезновение видов животных и растений — все это последствия нерационального использования природных ресурсов.\nПонимание экологических процессов помогает нам принимать правильные решения для сохранения природы. Экология учит нас жить в гармонии с окружающим миром, не нарушая природный баланс.\nЗащита окружающей среды — это не просто модная тенденция, а необходимость для выживания человечества. Каждый из нас может внести свой вклад в сохранение природы для будущих поколений.\nЭкология изучает также круговороты вещества и энергии в природе, структуру пищевых цепей и устойчивость экосистем.",
         "Ecology is the science of the interaction of living organisms with each other and with their environment.\nEnvironmental problems affect each of us. Air, water and soil pollution, climate change, extinction of species are all consequences of irrational use of natural resources.\nUnderstanding ecological processes helps us make the right decisions to protect nature.\nProtecting the environment is not just a fashionable trend, but a necessity for the survival of humanity.\nEcology also studies the cycles of matter and energy in nature, the structure of food chains and the resilience of ecosystems.", 1),
        ("climate", "🌡️", "Изменение климата", "Climate change",
         "Глобальное изменение климата и его последствия", "Global climate change and its consequences",
         "Изменение климата — одна из самых серьезных экологических проблем современности. Повышение средней температуры Земли приводит к таянию ледников, повышению уровня моря и изменению погодных условий.\nОсновной причиной изменения климата является увеличение концентрации парниковых газов в атмосфере, вызванное деятельностью человека.\nПоследствия изменения климата уже ощущаются во всем мире: участились экстремальные погодные явления, изменились сезоны, нарушились экосистемы.\nДля решения проблемы необходимо сокращение выбросов парниковых газов, переход на возобновляемые источники энергии и адаптация к новым климатическим условиям.\nПарижское соглашение и национальные климатические стратегии задают ориентиры по ограничению потепления.",
         "Climate change is one of the most serious environmental problems of our time.\nThe main cause is the increase in greenhouse gases caused by human activities.\nThe consequences are already being felt: extreme weather events, disrupted ecosystems.\nReducing emissions and switching to renewable energy are essential.\nThe Paris Agreement sets targets for limiting warming.", 2),
        ("biodiversity", "🦋", "Биоразнообразие", "Biodiversity",
         "Сохранение биоразнообразия", "Conservation of biodiversity",
         "Биоразнообразие — это разнообразие жизни на Земле во всех ее проявлениях. Оно включает миллионы видов растений, животных, грибов и микроорганизмов.\nБиоразнообразие имеет огромное значение для функционирования экосистем. Каждый вид играет свою роль в поддержании экологического баланса.\nТемпы исчезновения видов в 100–1000 раз выше естественных. Основные причины — разрушение мест обитания и загрязнение среды.\nСохранение биоразнообразия требует создания охраняемых территорий и восстановления экосистем.\nВ Беларуси биоразнообразие сохраняется в заповедниках и национальных парках.",
         "Biodiversity is the diversity of life on Earth in all its forms.\nIt is vital for ecosystem functioning — each species plays a role.\nExtinction rates are 100–1000 times higher than natural rates.\nConservation requires protected areas and ecosystem restoration.\nBelarusian reserves protect rare and endangered species.", 3),
        ("pollution", "🏭", "Загрязнение окружающей среды", "Environmental pollution",
         "Проблемы загрязнения и пути решения", "Pollution problems and solutions",
         "Загрязнение окружающей среды — это попадание в природную среду веществ, которые оказывают негативное воздействие на живые организмы. Различают загрязнение воздуха, воды, почвы.\nЗагрязнение воздуха происходит в результате выбросов промышленных предприятий и транспорта.\nЗагрязнение воды представляет серьезную угрозу для здоровья людей и водных экосистем.\nРешение проблем требует внедрения чистых технологий, переработки отходов и ответственного потребления.\nЗагрязнение пластиком — отдельная большая проблема: миллионы тонн пластика ежегодно попадают в океаны.",
         "Environmental pollution is the introduction of harmful substances into nature.\nAir pollution from industry and transport causes health problems.\nWater pollution threatens human health and aquatic ecosystems.\nSolutions include clean technologies, recycling and responsible consumption.\nPlastic pollution is a major challenge requiring urgent action.", 4),
        ("resources", "🌳", "Природные ресурсы", "Natural resources",
         "Рациональное использование природных ресурсов", "Rational use of natural resources",
         "Природные ресурсы делятся на возобновляемые (леса, вода, почва) и невозобновляемые (нефть, газ, уголь).\nНерациональное использование ресурсов приводит к их истощению и деградации экосистем.\nРациональное использование предполагает эффективное применение, переработку и восстановление ресурсов.\nКаждый из нас может экономить воду и электроэнергию, сортировать отходы и выбирать экологически чистые продукты.\nЛеса производят кислород, регулируют климат и служат средой обитания для множества видов.",
         "Natural resources are divided into renewable and non-renewable.\nIrrational use leads to depletion and ecosystem degradation.\nRational use involves efficiency, recycling and restoration.\nEveryone can save water, energy and sort waste.\nForests produce oxygen, regulate climate and support biodiversity.", 5),
        ("protection", "🛡️", "Охрана природы", "Nature protection",
         "Меры по охране природы", "Measures for nature protection",
         "Охрана природы — это комплекс мер, направленных на сохранение и восстановление природных ресурсов.\nОсобо охраняемые природные территории играют ключевую роль в сохранении биоразнообразия.\nВосстановление нарушенных экосистем — важное направление охраны природы.\nЭкологическое просвещение формирует экологическое сознание у людей.\nМеждународная кооперация позволяет сохранять уникальные ландшафты и виды.",
         "Nature protection is a set of measures to preserve and restore natural resources.\nProtected areas play a key role in conserving biodiversity.\nEcosystem restoration helps return nature to its original state.\nEnvironmental education raises ecological awareness.\nInternational cooperation preserves unique landscapes and species.", 6),
        ("sustainable", "♻️", "Устойчивое развитие", "Sustainable development",
         "Концепция устойчивого развития", "The concept of sustainable development",
         "Устойчивое развитие — это модель развития общества, которая удовлетворяет потребности настоящего, не ставя под угрозу будущие поколения.\nТри основных принципа: экономическая эффективность, социальная справедливость и экологическая устойчивость.\nУстойчивое развитие предполагает переход к «зелёной» экономике и возобновляемым источникам энергии.\nКаждый из нас может способствовать устойчивому развитию через ответственное потребление.\nЦели устойчивого развития ООН требуют совместных усилий государств, бизнеса и общества.",
         "Sustainable development meets present needs without compromising future generations.\nThree principles: economic efficiency, social justice and environmental sustainability.\nIt involves a green economy and renewable energy.\nEveryone can contribute through responsible consumption.\nUN SDGs require joint efforts by governments, businesses and civil society.", 7),
    ]
    for t in topics:
        cur.execute("""
            INSERT INTO ecology_topics (id, icon, title_ru, title_en, content_title_ru, content_title_en, paragraphs_ru, paragraphs_en, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, t)


def init_db():
    """Инициализация базы данных (создание таблиц и загрузка данных из интернета)."""
    conn = get_db_connection()
    cur = conn.cursor()

    # Таблица животных, привязанных к заповеднику
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS animals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reserve_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            species TEXT NOT NULL,
            description TEXT
        )
        """
    )

    # Таблица домиков, привязанных к заповеднику
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS cabins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reserve_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            name_en TEXT,
            description TEXT,
            description_en TEXT,
            capacity INTEGER,
            price_per_night REAL,
            source_url TEXT,
            amenities TEXT,
            amenities_en TEXT,
            details TEXT,
            image TEXT
        )
        """
    )

    cur.execute("PRAGMA table_info(cabins)")
    cabin_columns = {column[1] for column in cur.fetchall()}
    for col, col_type in {
        "name_en": "TEXT",
        "description_en": "TEXT",
        "amenities": "TEXT",
        "amenities_en": "TEXT",
        "details": "TEXT",
        "image": "TEXT",
    }.items():
        if col not in cabin_columns:
            cur.execute(f"ALTER TABLE cabins ADD COLUMN {col} {col_type}")
            print(f"✓ Добавлена колонка '{col}' в таблицу cabins")

    # Таблица бронирований домиков
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reserve_id INTEGER NOT NULL,
            cabin_name TEXT NOT NULL,
            guest_name TEXT NOT NULL,
            guest_email TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            guests INTEGER NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )

    # Таблица пользователей
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_salt TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            favorite_reserve_id INTEGER,
            avatar TEXT,
            bio TEXT,
            location TEXT,
            created_at TEXT
        )
        """
    )
    
    # Проверяем и добавляем недостающие колонки в таблицу users
    cur.execute("PRAGMA table_info(users)")
    columns = [column[1] for column in cur.fetchall()]
    
    if 'avatar' not in columns:
        cur.execute("ALTER TABLE users ADD COLUMN avatar TEXT")
        print("✓ Добавлена колонка 'avatar' в таблицу users")
    
    if 'bio' not in columns:
        cur.execute("ALTER TABLE users ADD COLUMN bio TEXT")
        print("✓ Добавлена колонка 'bio' в таблицу users")
    
    if 'location' not in columns:
        cur.execute("ALTER TABLE users ADD COLUMN location TEXT")
        print("✓ Добавлена колонка 'location' в таблицу users")

    if 'created_at' not in columns:
        cur.execute("ALTER TABLE users ADD COLUMN created_at TEXT")
        print("✓ Добавлена колонка 'created_at' в таблицу users")

    if 'oauth_provider' not in columns:
        cur.execute("ALTER TABLE users ADD COLUMN oauth_provider TEXT")
        print("✓ Добавлена колонка 'oauth_provider' в таблицу users")

    if 'oauth_provider_user_id' not in columns:
        cur.execute("ALTER TABLE users ADD COLUMN oauth_provider_user_id TEXT")
        print("✓ Добавлена колонка 'oauth_provider_user_id' в таблицу users")

    # Таблица избранных заповедников
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            reserve_id INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE(user_id, reserve_id)
        )
        """
    )

    # Таблица сообщений обратной связи
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            name TEXT,
            email TEXT,
            message TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )

    # Таблица истории активности пользователей
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS user_activity (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            activity_type TEXT NOT NULL,
            title TEXT NOT NULL,
            url TEXT,
            created_at TEXT NOT NULL
        )
        """
    )

    # Таблица уведомлений
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        )
        """
    )

    # Таблица настроек приватности
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS privacy_settings (
            user_id INTEGER PRIMARY KEY,
            show_activity INTEGER DEFAULT 1,
            show_favorites INTEGER DEFAULT 1,
            allow_notifications INTEGER DEFAULT 1
        )
        """
    )

    # Таблица экскурсий
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS excursions (            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reserve_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            guide TEXT,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            duration TEXT,
            max_participants INTEGER DEFAULT 20,
            price REAL DEFAULT 0,
            created_at TEXT NOT NULL
        )
        """
    )

    # Таблица записей на экскурсии
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS excursion_registrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            excursion_id INTEGER NOT NULL,
            user_id INTEGER,
            guest_name TEXT NOT NULL,
            guest_email TEXT NOT NULL,
            guests INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            UNIQUE(excursion_id, guest_email)
        )
        """
    )

    # Таблица тем экологии
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS ecology_topics (
            id TEXT PRIMARY KEY,
            icon TEXT NOT NULL DEFAULT '🌍',
            title_ru TEXT NOT NULL,
            title_en TEXT NOT NULL,
            content_title_ru TEXT NOT NULL,
            content_title_en TEXT NOT NULL,
            paragraphs_ru TEXT NOT NULL,
            paragraphs_en TEXT NOT NULL,
            sort_order INTEGER DEFAULT 0
        )
        """
    )

    # Добавляем колонку is_admin если её нет
    cur.execute("PRAGMA table_info(users)")
    columns = [c[1] for c in cur.fetchall()]
    if 'is_admin' not in columns:
        cur.execute("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0")
        print("✓ Добавлена колонка 'is_admin' в таблицу users")

    # Добавляем колонку reply в feedback если её нет
    cur.execute("PRAGMA table_info(feedback)")
    fb_columns = [c[1] for c in cur.fetchall()]
    if 'reply' not in fb_columns:
        cur.execute("ALTER TABLE feedback ADD COLUMN reply TEXT")
        print("✓ Добавлена колонка 'reply' в таблицу feedback")
    if 'reply_at' not in fb_columns:
        cur.execute("ALTER TABLE feedback ADD COLUMN reply_at TEXT")
        print("✓ Добавлена колонка 'reply_at' в таблицу feedback")

    # Создаём admin-аккаунт если его нет
    cur.execute("SELECT id FROM users WHERE email = ?", ("admin@ecology-world.by",))
    if not cur.fetchone():
        salt, pwd_hash = hash_password("admin123")
        cur.execute(
            """INSERT INTO users (name, email, password_salt, password_hash, is_admin, created_at)
               VALUES (?, ?, ?, ?, 1, ?)""",
            ("Admin", "admin@ecology-world.by", salt, pwd_hash, datetime.utcnow().isoformat())
        )
        print("✓ Создан admin-аккаунт (email: admin@ecology-world.by, пароль: admin123)")

    # Seed тем экологии если таблица пуста
    cur.execute("SELECT COUNT(*) AS cnt FROM ecology_topics")
    if cur.fetchone()["cnt"] == 0:
        seed_ecology_topics(cur)
        print("✓ Темы экологии загружены")

    # Загрузка информации о животных из интернета (если таблица пока пуста)
    cur.execute("SELECT COUNT(*) AS cnt FROM animals")
    count = cur.fetchone()["cnt"]
    if count == 0:
        seed_animals_from_web(cur)

    # Загрузка информации о домиках из интернета (если таблица пока пуста)
    cur.execute("SELECT COUNT(*) AS cnt FROM cabins")
    cabins_count = cur.fetchone()["cnt"]
    if cabins_count == 0:
        seed_cabins_from_web(cur)

    conn.commit()
    conn.close()
    print("✓ База данных успешно инициализирована")


# Данные о заповедниках Беларуси (пока храним в памяти)
RESERVES_DATA = [
    {
        "id": 1,
        "name": "Беловежская пуща",
        "name_en": "Belovezhskaya Pushcha",
        "description": "Беловежская пуща — крупнейший и старейший лесной массив Европы, сохранившийся в первозданном виде с доисторических времён. Этот уникальный природный комплекс занесён в список Всемирного наследия ЮНЕСКО и является биосферным резерватом международного значения. Здесь произрастают вековые дубы, ясени и сосны возрастом более 500 лет, а густые леса служат домом для сотен видов животных и растений.\n\nГлавный символ заповедника — европейский зубр, крупнейшее наземное млекопитающее Европы. В начале XX века этот вид был полностью истреблён в дикой природе, однако благодаря усилиям учёных и природоохранным программам популяция была восстановлена именно здесь, в Беловежской пуще. Сегодня на территории заповедника обитает около 600 зубров.\n\nЛесной массив отличается исключительным биоразнообразием: более 1000 видов растений, 59 видов млекопитающих, 253 вида птиц, 24 вида рыб и 7 видов рептилий. Многие из них занесены в Красную книгу Республики Беларусь и Международный красный список МСОП.\n\nТерритория заповедника разделена на несколько зон с различным режимом охраны. Заповедная зона полностью закрыта для посещения и служит эталоном нетронутой природы. Рекреационная зона открыта для туристов и предлагает разнообразные маршруты — пешие, велосипедные и конные.\n\nВ заповеднике работает Музей природы, вольеры с дикими животными, визит-центр и несколько туристических комплексов. Ежегодно Беловежскую пущу посещают сотни тысяч туристов из Беларуси и со всего мира.",
        "description_en": "Belovezhskaya Pushcha is the largest and oldest forest massif in Europe, preserved in its primeval state since prehistoric times. This unique natural complex is inscribed on the UNESCO World Heritage List and is an internationally significant biosphere reserve. Ancient oaks, ash trees and pines over 500 years old grow here, and the dense forests are home to hundreds of species of animals and plants.\n\nThe main symbol of the reserve is the European bison, the largest land mammal in Europe. At the beginning of the 20th century this species was completely exterminated in the wild, but thanks to the efforts of scientists and conservation programmes the population was restored here, in Belovezhskaya Pushcha. Today approximately 600 bison inhabit the reserve.\n\nThe forest massif is characterised by exceptional biodiversity: over 1,000 plant species, 59 mammal species, 253 bird species, 24 fish species and 7 reptile species. Many of them are listed in the Red Book of the Republic of Belarus and the IUCN Red List.\n\nThe reserve territory is divided into several zones with different protection regimes. The strict nature reserve zone is completely closed to visitors and serves as a benchmark of untouched nature. The recreational zone is open to tourists and offers a variety of routes — hiking, cycling and horse-riding.\n\nThe reserve has a Nature Museum, wildlife enclosures, a visitor centre and several tourist complexes. Hundreds of thousands of tourists from Belarus and around the world visit Belovezhskaya Pushcha every year.",
        "area": "150000",
        "location": {"lat": 52.5736, "lng": 23.7994},
        "established": "1939",
        "image": "/images/reserves/belovezhskaya-pushcha.jpg",
        "gallery": [
            "/images/reserves/belovezhskaya-pushcha-1.jpg",
            "/images/reserves/belovezhskaya-pushcha-2.jpg",
            "/images/reserves/belovezhskaya-pushcha-3.jpg"
        ],
        "features": [
            "Европейский зубр – символ заповедника",
            "Древние дубы возрастом более 500 лет",
            "Биосферный заповедник ЮНЕСКО",
            "Разнообразные пешеходные и велосипедные маршруты",
            "Научные станции и экологические тропы"
        ],
        "features_en": [
            "European bison — the symbol of the reserve",
            "Ancient oaks over 500 years old",
            "UNESCO Biosphere Reserve",
            "Diverse hiking and cycling trails",
            "Research stations and ecological paths"
        ],
        "facts": {
            "ru": [
                {"label": "Статус", "value": "Национальный парк и биосферный резерват ЮНЕСКО"},
                {"label": "Площадь", "value": "150 000 га (из них 87 600 га в Беларуси)"},
                {"label": "Год основания", "value": "1939 (белорусская часть)"},
                {"label": "Количество видов растений", "value": "более 1000"},
                {"label": "Количество видов животных", "value": "более 250 позвоночных"},
                {"label": "Зубров в заповеднике", "value": "около 600 особей"},
                {"label": "Возраст некоторых дубов", "value": "до 600 лет"},
                {"label": "Официальный сайт", "value": "npbp.by"},
                {"label": "Статус ЮНЕСКО", "value": "Объект Всемирного наследия с 1979 года"},
                {"label": "Количество видов птиц", "value": "253 вида"},
                {"label": "Количество видов грибов", "value": "более 3000"},
                {"label": "Протяжённость экотроп", "value": "более 350 км"},
                {"label": "Ежегодное число туристов", "value": "около 400 000 человек"},
                {"label": "Средняя высота деревьев", "value": "30–40 м"}
            ],
            "en": [
                {"label": "Status", "value": "National Park and UNESCO Biosphere Reserve"},
                {"label": "Area", "value": "150,000 ha (87,600 ha in Belarus)"},
                {"label": "Founded", "value": "1939 (Belarusian part)"},
                {"label": "Plant species", "value": "over 1,000"},
                {"label": "Animal species", "value": "over 250 vertebrates"},
                {"label": "European bison", "value": "approx. 600 individuals"},
                {"label": "Age of oldest oaks", "value": "up to 600 years"},
                {"label": "Official website", "value": "npbp.by"},
                {"label": "UNESCO status", "value": "World Heritage Site since 1979"},
                {"label": "Bird species", "value": "253 species"},
                {"label": "Fungal species", "value": "over 3,000"},
                {"label": "Eco-trail length", "value": "over 350 km"},
                {"label": "Annual visitors", "value": "approx. 400,000"},
                {"label": "Average tree height", "value": "30–40 m"}
            ]
        },
        "visiting": {
            "ru": "Заповедник открыт для посещения круглый год. Работает визит-центр, музей природы, вольеры с животными. Организуются пешие, велосипедные и конные маршруты. Лучшее время для посещения — май–сентябрь. Для въезда на автомобиле требуется пропуск. Экскурсии проводятся ежедневно.",
            "en": "The reserve is open year-round. There is a visitor centre, nature museum and animal enclosures. Hiking, cycling and horse-riding routes are available. The best time to visit is May–September. A permit is required for vehicle entry. Guided tours run daily."
        }
    },
    {
        "id": 2,
        "name": "Березинский биосферный заповедник",
        "name_en": "Berezinsky Biosphere Reserve",
        "description": "Березинский биосферный заповедник — старейший заповедник Беларуси, основанный в 1925 году для охраны уникальных болотных и лесных экосистем бассейна реки Березина. Включён в международную сеть биосферных резерватов ЮНЕСКО и является одним из наиболее значимых природоохранных объектов Восточной Европы.\n\nЗаповедник представляет собой огромный нетронутый природный комплекс площадью более 85 000 гектаров. Здесь сохранились обширные верховые и переходные болота, старовозрастные леса, чистые реки и озёра. Уровень естественности природных процессов здесь один из самых высоких в регионе.\n\nОсобую ценность представляет орнитофауна заповедника: более 230 видов птиц, из которых многие гнездятся здесь постоянно. Среди них — большой подорлик, чёрный аист, беркут, филин и серый журавль. Заповедник является важным местом остановки перелётных птиц на Беловежско-Балтийском миграционном пути.\n\nРека Березина, протекающая через заповедник, является одной из крупнейших рек Беларуси. Её пойма богата водно-болотными угодьями, которые служат местом обитания бобров, выдр, норок и многих видов водоплавающих птиц.\n\nНа территории заповедника работает Музей природы с богатыми коллекциями флоры и фауны, экологический центр и несколько туристических маршрутов. Заповедник активно занимается научными исследованиями и экологическим просвещением.",
        "description_en": "The Berezinsky Biosphere Reserve is the oldest reserve in Belarus, founded in 1925 to protect the unique wetland and forest ecosystems of the Berezina River basin. It is included in the international UNESCO Biosphere Reserve network and is one of the most significant nature conservation sites in Eastern Europe.\n\nThe reserve is a vast, untouched natural complex covering more than 85,000 hectares. Extensive raised and transitional bogs, old-growth forests, clean rivers and lakes have been preserved here. The level of naturalness of ecological processes is among the highest in the region.\n\nThe reserve's birdlife is of particular value: over 230 bird species, many of which nest here permanently. These include the greater spotted eagle, black stork, golden eagle, eagle owl and common crane. The reserve is an important stopover for migratory birds on the Belovezhskaya-Baltic migration route.\n\nThe Berezina River, which flows through the reserve, is one of the largest rivers in Belarus. Its floodplain is rich in wetlands that serve as habitat for beavers, otters, mink and many species of waterfowl.\n\nThe reserve has a Nature Museum with extensive flora and fauna collections, an ecological centre and several tourist trails. The reserve is actively engaged in scientific research and environmental education.",
        "area": "85100",
        "location": {"lat": 54.7333, "lng": 28.2833},
        "established": "1925",
        "image": "/images/reserves/berezinsky.jpg",
        "gallery": [
            "/images/reserves/berezinsky-1.jpg",
            "/images/reserves/berezinsky-2.jpg",
            "/images/reserves/berezinsky-3.jpg"
        ],
        "features": [
            "Обширные болотные экосистемы",
            "Место обитания бобров и выдр",
            "Редкие виды птиц, занесённые в Красную книгу",
            "Развитая сеть экологических маршрутов",
            "Центр экологического просвещения и музеем природы"
        ],
        "features_en": [
            "Extensive wetland ecosystems",
            "Habitat of beavers and otters",
            "Rare bird species listed in the Red Book",
            "Well-developed network of ecological trails",
            "Environmental education centre and nature museum"
        ],
        "facts": {
            "ru": [
                {"label": "Статус", "value": "Биосферный резерват ЮНЕСКО"},
                {"label": "Площадь", "value": "85 100 га"},
                {"label": "Год основания", "value": "1925 (старейший заповедник Беларуси)"},
                {"label": "Количество видов растений", "value": "более 900"},
                {"label": "Количество видов птиц", "value": "более 230"},
                {"label": "Количество видов млекопитающих", "value": "более 50"},
                {"label": "Протяжённость рек", "value": "около 400 км"},
                {"label": "Официальный сайт", "value": "berezinsky.by"},
                {"label": "Количество видов рыб", "value": "34 вида"},
                {"label": "Площадь болот", "value": "около 30% территории"},
                {"label": "Количество видов насекомых", "value": "более 2500"},
                {"label": "Охраняемых видов растений", "value": "28 видов Красной книги"},
                {"label": "Длина реки Березина", "value": "613 км"},
                {"label": "Туристических маршрутов", "value": "7 экологических троп"}
            ],
            "en": [
                {"label": "Status", "value": "UNESCO Biosphere Reserve"},
                {"label": "Area", "value": "85,100 ha"},
                {"label": "Founded", "value": "1925 (oldest reserve in Belarus)"},
                {"label": "Plant species", "value": "over 900"},
                {"label": "Bird species", "value": "over 230"},
                {"label": "Mammal species", "value": "over 50"},
                {"label": "River length", "value": "approx. 400 km"},
                {"label": "Official website", "value": "berezinsky.by"},
                {"label": "Fish species", "value": "34 species"},
                {"label": "Wetland area", "value": "approx. 30% of territory"},
                {"label": "Insect species", "value": "over 2,500"},
                {"label": "Red Book plant species", "value": "28 species"},
                {"label": "Berezina River length", "value": "613 km"},
                {"label": "Tourist trails", "value": "7 ecological paths"}
            ]
        },
        "visiting": {
            "ru": "Заповедник принимает туристов с мая по октябрь. Доступны экологические тропы, сплавы по реке Березина, наблюдение за птицами. Работает музей природы и экологический центр. Размещение в гостевых домах на территории заповедника. Экскурсии необходимо бронировать заранее.",
            "en": "The reserve welcomes tourists from May to October. Ecological trails, rafting on the Berezina River and birdwatching are available. A nature museum and ecological centre are open to visitors. Accommodation is available in guesthouses within the reserve. Excursions should be booked in advance."
        }
    },
    {
        "id": 3,
        "name": "Припятский национальный парк",
        "name_en": "Pripyatsky National Park",
        "description": "Припятский национальный парк — крупнейший национальный парк Беларуси, расположенный в пойме реки Припять на Полесье. Основан в 1996 году для сохранения уникальных пойменных экосистем, которые являются одними из крупнейших в Европе. Парк входит в список водно-болотных угодий международного значения по Рамсарской конвенции.\n\nРека Припять — одна из крупнейших рек Беларуси и главная водная артерия Полесья. Её широкая пойма ежегодно затапливается весенними водами, создавая уникальные условия для жизни водоплавающих птиц, рыб и млекопитающих. Пойменные луга и дубравы вдоль Припяти — одни из самых живописных природных ландшафтов страны.\n\nПарк является одним из лучших мест для наблюдения за птицами в Беларуси. Здесь гнездятся более 260 видов птиц, в том числе редкие и исчезающие: орлан-белохвост, чёрный аист, большой кроншнеп, болотная сова. В период весеннего половодья парк привлекает огромные стаи перелётных птиц.\n\nВодные ресурсы парка богаты рыбой: в реках и озёрах обитает более 40 видов, включая щуку, судака, леща, карпа и сома. Рыбалка является одним из популярных видов отдыха на территории парка.\n\nДля туристов организуются речные экскурсии на теплоходе по Припяти, пешие маршруты по пойменным лугам и дубравам, наблюдение за птицами с вышек. Лучшее время для посещения — период весеннего половодья (апрель–май), когда пойма превращается в огромное внутреннее море.",
        "description_en": "Pripyatsky National Park is the largest national park in Belarus, located in the floodplain of the Pripyat River in Polesie. Founded in 1996 to preserve unique floodplain ecosystems that are among the largest in Europe, the park is included in the list of internationally significant wetlands under the Ramsar Convention.\n\nThe Pripyat River is one of the largest rivers in Belarus and the main waterway of Polesie. Its wide floodplain is inundated by spring waters every year, creating unique conditions for waterfowl, fish and mammals. The floodplain meadows and oak forests along the Pripyat are among the most picturesque natural landscapes in the country.\n\nThe park is one of the best birdwatching destinations in Belarus. Over 260 bird species nest here, including rare and endangered ones: white-tailed eagle, black stork, Eurasian curlew and short-eared owl. During the spring flood, the park attracts huge flocks of migratory birds.\n\nThe park's water resources are rich in fish: over 40 species inhabit the rivers and lakes, including pike, pike-perch, bream, carp and catfish. Fishing is one of the popular leisure activities in the park.\n\nFor tourists, river excursions by boat along the Pripyat, hiking routes through floodplain meadows and oak forests, and birdwatching from towers are organised. The best time to visit is during the spring flood (April–May), when the floodplain turns into a vast inland sea.",
        "area": "85841",
        "location": {"lat": 52.1167, "lng": 27.8667},
        "established": "1996",
        "image": "/images/reserves/pripyatsky.jpg",
        "gallery": [
            "/images/reserves/pripyatsky-1.jpg",
            "/images/reserves/pripyatsky-2.jpg",
            "/images/reserves/pripyatsky-3.jpg"
        ],
        "features": [
            "Пойменные луга и дубравы вдоль реки Припять",
            "Крупные популяции лося, бобра и водоплавающих птиц",
            "Водно-болотные угодья международного значения",
            "Популярные маршруты для наблюдения за птицами",
            "Разнообразные речные и водные экскурсии"
        ],
        "features_en": [
            "Floodplain meadows and oak forests along the Pripyat River",
            "Large populations of elk, beaver and waterfowl",
            "Internationally significant wetlands",
            "Popular birdwatching routes",
            "Diverse river and water excursions"
        ],
        "facts": {
            "ru": [
                {"label": "Статус", "value": "Национальный парк"},
                {"label": "Площадь", "value": "85 841 га"},
                {"label": "Год основания", "value": "1996"},
                {"label": "Протяжённость реки Припять", "value": "около 500 км"},
                {"label": "Количество видов птиц", "value": "более 260"},
                {"label": "Количество видов рыб", "value": "более 40"},
                {"label": "Пойменные луга", "value": "крупнейшие в Европе"},
                {"label": "Официальный сайт", "value": "npp.by"},
                {"label": "Количество видов млекопитающих", "value": "более 50"},
                {"label": "Рамсарское угодье", "value": "с 2001 года"},
                {"label": "Площадь пойменных лугов", "value": "около 20 000 га"},
                {"label": "Количество видов растений", "value": "более 850"},
                {"label": "Длина экскурсионного маршрута по реке", "value": "около 100 км"},
                {"label": "Высота весеннего паводка", "value": "до 5–7 м"}
            ],
            "en": [
                {"label": "Status", "value": "National Park"},
                {"label": "Area", "value": "85,841 ha"},
                {"label": "Founded", "value": "1996"},
                {"label": "Pripyat River length", "value": "approx. 500 km"},
                {"label": "Bird species", "value": "over 260"},
                {"label": "Fish species", "value": "over 40"},
                {"label": "Floodplain meadows", "value": "largest in Europe"},
                {"label": "Official website", "value": "npp.by"},
                {"label": "Mammal species", "value": "over 50"},
                {"label": "Ramsar wetland", "value": "since 2001"},
                {"label": "Floodplain meadow area", "value": "approx. 20,000 ha"},
                {"label": "Plant species", "value": "over 850"},
                {"label": "River excursion route", "value": "approx. 100 km"},
                {"label": "Spring flood height", "value": "up to 5–7 m"}
            ]
        },
        "visiting": {
            "ru": "Парк открыт для посещения с апреля по октябрь. Популярны речные экскурсии на теплоходе по Припяти, наблюдение за птицами, рыбалка. Работают экологические тропы и смотровые вышки. Размещение в туристических комплексах на берегу реки. Лучшее время — период весеннего половодья (апрель–май).",
            "en": "The park is open from April to October. River cruises on the Pripyat, birdwatching and fishing are popular activities. Ecological trails and observation towers are available. Accommodation is offered in tourist complexes on the riverbank. The best time to visit is during the spring flood (April–May)."
        }
    },
    {
        "id": 4,
        "name": "Нарочанский национальный парк",
        "name_en": "Narochansky National Park",
        "description": "Нарочанский национальный парк создан в 1999 году для охраны уникальных озёрных экосистем северо-западной Беларуси. На его территории расположено более 40 озёр ледникового происхождения, в том числе озеро Нарочь — крупнейшее озеро страны площадью почти 80 квадратных километров.\n\nОзеро Нарочь — жемчужина белорусской природы. Его кристально чистые воды, живописные берега и мягкий климат привлекают туристов и отдыхающих со всей страны. Максимальная глубина озера достигает почти 25 метров. Вода в озере настолько прозрачна, что дно просматривается на глубину нескольких метров.\n\nПарк отличается богатым биоразнообразием. Здесь обитают редкие виды рыб — европейский угорь и налим, а также многочисленные виды водоплавающих птиц: гагары, чомги, лебеди-шипуны, крохали. Леса парка населены лосями, кабанами, косулями и бобрами.\n\nНа берегах озёр расположены многочисленные санатории, базы отдыха и туристические комплексы. Нарочанский курорт является одним из главных оздоровительных центров Беларуси. Здесь развита инфраструктура для активного отдыха: велосипедные дорожки, пешеходные маршруты, водные виды спорта.\n\nЗимой парк превращается в популярный горнолыжный курорт. На берегу озера Нарочь работают лыжные трассы и каток. Парк открыт для посещения круглый год и предлагает разнообразные виды отдыха в любое время года.",
        "description_en": "Narochansky National Park was established in 1999 to protect the unique lake ecosystems of north-western Belarus. Its territory contains over 40 glacial lakes, including Lake Naroch — the largest lake in the country, covering almost 80 square kilometres.\n\nLake Naroch is the jewel of Belarusian nature. Its crystal-clear waters, picturesque shores and mild climate attract tourists and holidaymakers from across the country. The maximum depth of the lake reaches almost 25 metres. The water is so transparent that the bottom can be seen several metres down.\n\nThe park is characterised by rich biodiversity. Rare fish species — European eel and burbot — inhabit the waters, along with numerous waterfowl: divers, great crested grebes, mute swans and mergansers. The park's forests are home to elk, wild boar, roe deer and beavers.\n\nNumerous sanatoriums, holiday resorts and tourist complexes are located on the lakeshores. The Naroch resort is one of the main health and wellness centres in Belarus. Active leisure infrastructure is well developed: cycling paths, hiking routes and water sports.\n\nIn winter, the park becomes a popular ski resort. Ski slopes and an ice rink operate on the shore of Lake Naroch. The park is open year-round and offers a variety of leisure activities in any season.",
        "area": "97300",
        "location": {"lat": 54.9167, "lng": 26.7167},
        "established": "1999",
        "image": "/images/reserves/narochansky.jpg",
        "gallery": [
            "/images/reserves/narochansky-1.jpg",
            "/images/reserves/narochansky-2.jpg",
            "/images/reserves/narochansky-3.jpg"
        ],
        "features": [
            "Крупнейшее озеро Беларуси – Нарочь",
            "Система глубоких ледниковых озёр",
            "Богатые рыбные ресурсы и возможности для любительской рыбалки",
            "Санатории и базы отдыха на берегу озёр",
            "Пешеходные и велосипедные экотропы"
        ],
        "features_en": [
            "Lake Naroch — the largest lake in Belarus",
            "System of deep glacial lakes",
            "Rich fish resources and recreational fishing",
            "Sanatoriums and holiday resorts on the lakeshore",
            "Hiking and cycling eco-trails"
        ],
        "facts": {
            "ru": [
                {"label": "Статус", "value": "Национальный парк"},
                {"label": "Площадь", "value": "97 300 га"},
                {"label": "Год основания", "value": "1999"},
                {"label": "Площадь озера Нарочь", "value": "79,6 км²"},
                {"label": "Глубина озера Нарочь", "value": "до 24,8 м"},
                {"label": "Количество озёр", "value": "более 40"},
                {"label": "Количество видов рыб", "value": "более 30"},
                {"label": "Официальный сайт", "value": "narochpark.by"},
                {"label": "Количество видов птиц", "value": "более 200"},
                {"label": "Количество видов растений", "value": "более 800"},
                {"label": "Прозрачность воды в Нарочи", "value": "до 5–7 м"},
                {"label": "Количество санаториев", "value": "более 20"},
                {"label": "Длина береговой линии Нарочи", "value": "около 40 км"},
                {"label": "Возраст ледниковых озёр", "value": "12–15 тысяч лет"}
            ],
            "en": [
                {"label": "Status", "value": "National Park"},
                {"label": "Area", "value": "97,300 ha"},
                {"label": "Founded", "value": "1999"},
                {"label": "Lake Naroch area", "value": "79.6 km²"},
                {"label": "Lake Naroch depth", "value": "up to 24.8 m"},
                {"label": "Number of lakes", "value": "over 40"},
                {"label": "Fish species", "value": "over 30"},
                {"label": "Official website", "value": "narochpark.by"},
                {"label": "Bird species", "value": "over 200"},
                {"label": "Plant species", "value": "over 800"},
                {"label": "Water transparency (Naroch)", "value": "up to 5–7 m"},
                {"label": "Number of sanatoriums", "value": "over 20"},
                {"label": "Naroch shoreline length", "value": "approx. 40 km"},
                {"label": "Age of glacial lakes", "value": "12–15 thousand years"}
            ]
        },
        "visiting": {
            "ru": "Парк работает круглый год. Летом популярны купание, рыбалка, водные виды спорта. Зимой — лыжные трассы и катание на коньках. На берегу озера расположены санатории и базы отдыха. Развита велосипедная инфраструктура. Лучшее время для посещения — июнь–август.",
            "en": "The park is open year-round. In summer, swimming, fishing and water sports are popular. In winter, ski trails and ice skating are available. Sanatoriums and holiday resorts line the lakeshore. Cycling infrastructure is well developed. The best time to visit is June–August."
        }
    },
    {
        "id": 5,
        "name": "Браславские озера",
        "name_en": "Braslav Lakes",
        "description": "Национальный парк «Браславские озёра» основан в 1995 году для сохранения уникального озёрного края на севере Беларуси. Этот живописный уголок природы часто называют «белорусской Швейцарией» за холмистый рельеф, чистые озёра и нетронутые леса. Парк включает более 30 озёр ледникового происхождения с кристально чистой водой.\n\nОзёрный комплекс Браслава сформировался в результате деятельности ледника около 12–15 тысяч лет назад. Живописные холмы, многочисленные острова и полуострова, извилистые берега создают неповторимый пейзаж. Крупнейшее озеро — Дривяты площадью более 36 квадратных километров.\n\nПарк является одним из лучших мест для водного туризма в Беларуси. Здесь можно арендовать лодки, байдарки и катамараны, совершить многодневный водный поход по системе озёр. Рыбалка — ещё одно популярное занятие: в озёрах водятся щука, окунь, судак, лещ и другие виды рыб.\n\nС вершин холмов Маяк и Замковая открываются захватывающие панорамные виды на озёрный край. Смотровые площадки оборудованы для удобства туристов. Развита сеть пешеходных и велосипедных маршрутов, позволяющих исследовать парк в своём темпе.\n\nПарк богат историческими и культурными памятниками. На его территории расположены древние городища, курганы и замчища. Город Браслав — один из старейших городов Беларуси — является культурным центром региона с богатой историей.",
        "description_en": "Braslav Lakes National Park was founded in 1995 to preserve the unique lake district in northern Belarus. This picturesque corner of nature is often called the 'Belarusian Switzerland' for its hilly terrain, clean lakes and untouched forests. The park includes over 30 glacial lakes with crystal-clear water.\n\nThe Braslav lake complex was formed as a result of glacial activity approximately 12–15 thousand years ago. Picturesque hills, numerous islands and peninsulas, and winding shores create a unique landscape. The largest lake — Drivyaty — covers more than 36 square kilometres.\n\nThe park is one of the best destinations for water tourism in Belarus. Boats, kayaks and catamarans can be rented here, and multi-day water trips through the lake system are possible. Fishing is another popular activity: pike, perch, pike-perch, bream and other fish species inhabit the lakes.\n\nFrom the summits of Mayak and Zamkovaya hills, breathtaking panoramic views of the lake district open up. Observation platforms are equipped for the convenience of tourists. A network of hiking and cycling routes allows visitors to explore the park at their own pace.\n\nThe park is rich in historical and cultural monuments. Ancient hillforts, burial mounds and castle sites are located on its territory. The town of Braslav — one of the oldest towns in Belarus — is the cultural centre of the region with a rich history.",
        "area": "69115",
        "location": {"lat": 55.6333, "lng": 27.0333},
        "established": "1995",
        "image": "/images/reserves/braslavskie.jpg",
        "gallery": [
            "/images/reserves/braslavskie-1.jpg",
            "/images/reserves/braslavskie-2.jpg",
            "/images/reserves/braslavskie-3.jpg"
        ],
        "features": [
            "Ледниковые озёра с кристально чистой водой",
            "Многочисленные острова и полуострова",
            "Популярное место для водного туризма и рыбалки",
            "Смотровые площадки с панорамным видом",
            "Развитая сеть туристических маршрутов и кемпингов"
        ],
        "features_en": [
            "Glacial lakes with crystal-clear water",
            "Numerous islands and peninsulas",
            "Popular destination for water tourism and fishing",
            "Observation platforms with panoramic views",
            "Well-developed network of tourist trails and campsites"
        ],
        "facts": {
            "ru": [
                {"label": "Статус", "value": "Национальный парк"},
                {"label": "Площадь", "value": "69 115 га"},
                {"label": "Год основания", "value": "1995"},
                {"label": "Количество озёр", "value": "более 30"},
                {"label": "Крупнейшее озеро", "value": "Дривяты (36,1 км²)"},
                {"label": "Количество островов", "value": "более 40"},
                {"label": "Количество видов птиц", "value": "более 220"},
                {"label": "Официальный сайт", "value": "braslavpark.by"},
                {"label": "Количество видов рыб", "value": "более 30"},
                {"label": "Количество видов растений", "value": "более 700"},
                {"label": "Возраст озёрного комплекса", "value": "12–15 тысяч лет"},
                {"label": "Глубина озера Дривяты", "value": "до 12 м"},
                {"label": "Протяжённость велодорожек", "value": "более 100 км"},
                {"label": "Историческое название города", "value": "Браслав — с X века"}
            ],
            "en": [
                {"label": "Status", "value": "National Park"},
                {"label": "Area", "value": "69,115 ha"},
                {"label": "Founded", "value": "1995"},
                {"label": "Number of lakes", "value": "over 30"},
                {"label": "Largest lake", "value": "Drivyaty (36.1 km²)"},
                {"label": "Number of islands", "value": "over 40"},
                {"label": "Bird species", "value": "over 220"},
                {"label": "Official website", "value": "braslavpark.by"},
                {"label": "Fish species", "value": "over 30"},
                {"label": "Plant species", "value": "over 700"},
                {"label": "Age of lake complex", "value": "12–15 thousand years"},
                {"label": "Drivyaty lake depth", "value": "up to 12 m"},
                {"label": "Cycling path length", "value": "over 100 km"},
                {"label": "Historical town", "value": "Braslav — since 10th century"}
            ]
        },
        "visiting": {
            "ru": "Парк открыт круглый год. Летом популярны водный туризм, рыбалка, кемпинг на берегах озёр. Смотровые горы Маяк и Замковая открывают панорамные виды. Развита сеть велосипедных маршрутов. Лучшее время — июнь–август. Доступна аренда лодок и байдарок.",
            "en": "The park is open year-round. In summer, water tourism, fishing and lakeside camping are popular. Mayak and Zamkovaya hills offer panoramic views. A network of cycling routes is available. The best time to visit is June–August. Boat and kayak rental is available."
        }
    },
    {
        "id": 6,
        "name": "Полесский радиационно-экологический заповедник",
        "name_en": "Polessky Radiation-Ecological Reserve",
        "description": "Полесский радиационно-экологический заповедник создан в 1988 году после катастрофы на Чернобыльской атомной электростанции. Он занимает часть территории, подвергшейся наиболее сильному радиоактивному загрязнению в результате аварии. Заповедник является уникальным природным объектом, не имеющим аналогов в мире.\n\nТерритория заповедника практически лишена постоянного проживания людей, что создало уникальные условия для наблюдения за естественным восстановлением природы без антропогенного воздействия. За прошедшие десятилетия природа демонстрирует удивительную способность к самовосстановлению.\n\nПарадоксально, но отсутствие людей привело к расцвету дикой природы. Численность многих видов животных здесь значительно выше, чем в соседних незагрязнённых районах. На территории заповедника обитают волки, кабаны, лоси, косули, рыси, бурые медведи и даже лошади Пржевальского, выпущенные сюда в 1998 году.\n\nЗаповедник является крупнейшим в стране центром научных исследований в области радиоэкологии. Учёные изучают влияние радиации на живые организмы, процессы самоочищения экосистем и долгосрочные последствия радиоактивного загрязнения для биоразнообразия.\n\nПосещение заповедника возможно только в составе организованных научных или образовательных групп с специальным разрешением. Территория разделена на зоны с различным уровнем радиационного загрязнения. Несмотря на ограничения, заповедник привлекает учёных и исследователей со всего мира.",
        "description_en": "The Polessky Radiation-Ecological Reserve was established in 1988 following the catastrophe at the Chernobyl nuclear power plant. It occupies part of the territory that suffered the most severe radioactive contamination as a result of the accident. The reserve is a unique natural site with no equivalent anywhere in the world.\n\nThe reserve territory is virtually devoid of permanent human habitation, which has created unique conditions for observing the natural recovery of nature without anthropogenic impact. Over the decades, nature has demonstrated a remarkable capacity for self-restoration.\n\nParadoxically, the absence of humans has led to a flourishing of wildlife. The numbers of many animal species here are significantly higher than in neighbouring uncontaminated areas. Wolves, wild boar, elk, roe deer, lynx, brown bears and even Przewalski's horses, released here in 1998, inhabit the reserve.\n\nThe reserve is the country's largest centre for scientific research in the field of radioecology. Scientists study the effects of radiation on living organisms, the processes of ecosystem self-purification and the long-term consequences of radioactive contamination for biodiversity.\n\nVisiting the reserve is only possible as part of organised scientific or educational groups with special permits. The territory is divided into zones with different levels of radioactive contamination. Despite the restrictions, the reserve attracts scientists and researchers from around the world.",
        "area": "216093",
        "location": {"lat": 51.8333, "lng": 28.3333},
        "established": "1988",
        "image": "/images/reserves/polesky.jpg",
        "gallery": [
            "/images/reserves/polesky-1.jpg",
            "/images/reserves/polesky-2.jpg",
            "/images/reserves/polesky-3.jpg"
        ],
        "features": [
            "Крупнейшая в стране территория без постоянного проживания людей",
            "Изучение последствий радиационного загрязнения",
            "Восстановление лесных и болотных экосистем",
            "Богатый животный мир в условиях минимального антропогенного влияния",
            "Научные исследования по радиоэкологии и природному восстановлению"
        ],
        "features_en": [
            "The largest uninhabited territory in the country",
            "Study of radioactive contamination consequences",
            "Recovery of forest and wetland ecosystems",
            "Rich wildlife with minimal human impact",
            "Scientific research in radioecology and natural restoration"
        ],
        "facts": {
            "ru": [
                {"label": "Статус", "value": "Радиационно-экологический заповедник"},
                {"label": "Площадь", "value": "216 093 га"},
                {"label": "Год основания", "value": "1988 (после аварии на ЧАЭС)"},
                {"label": "Расстояние до ЧАЭС", "value": "около 30 км"},
                {"label": "Количество видов млекопитающих", "value": "более 60"},
                {"label": "Количество видов птиц", "value": "более 280"},
                {"label": "Постоянное население", "value": "отсутствует"},
                {"label": "Официальный сайт", "value": "zapovednik.by"},
                {"label": "Лошади Пржевальского", "value": "выпущены в 1998 году"},
                {"label": "Количество зон загрязнения", "value": "3 зоны разного уровня"},
                {"label": "Количество видов растений", "value": "более 1200"},
                {"label": "Площадь лесов", "value": "около 70% территории"},
                {"label": "Научных экспедиций в год", "value": "более 50"},
                {"label": "Период полураспада Cs-137", "value": "около 30 лет"}
            ],
            "en": [
                {"label": "Status", "value": "Radiation-Ecological Reserve"},
                {"label": "Area", "value": "216,093 ha"},
                {"label": "Founded", "value": "1988 (after the Chernobyl disaster)"},
                {"label": "Distance to Chernobyl NPP", "value": "approx. 30 km"},
                {"label": "Mammal species", "value": "over 60"},
                {"label": "Bird species", "value": "over 280"},
                {"label": "Permanent population", "value": "none"},
                {"label": "Official website", "value": "zapovednik.by"},
                {"label": "Przewalski's horses", "value": "released in 1998"},
                {"label": "Contamination zones", "value": "3 zones of varying levels"},
                {"label": "Plant species", "value": "over 1,200"},
                {"label": "Forest coverage", "value": "approx. 70% of territory"},
                {"label": "Scientific expeditions per year", "value": "over 50"},
                {"label": "Cs-137 half-life", "value": "approx. 30 years"}
            ]
        },
        "visiting": {
            "ru": "Заповедник закрыт для свободного посещения. Въезд возможен только в составе организованных научных или образовательных групп с специальным разрешением. Территория является уникальным природным лабораторией для изучения восстановления экосистем после радиационного загрязнения.",
            "en": "The reserve is closed to independent visitors. Entry is only possible as part of organised scientific or educational groups with special permits. The territory serves as a unique natural laboratory for studying ecosystem recovery after radioactive contamination."
        }
    }
]


@app.route('/api/reserves', methods=['GET'])
def get_reserves():
    """Получить список всех заповедников"""
    return jsonify(RESERVES_DATA)


@app.route('/api/reserves/<int:reserve_id>', methods=['GET'])
def get_reserve(reserve_id):
    """Получить информацию о конкретном заповеднике"""
    reserve = next((r for r in RESERVES_DATA if r['id'] == reserve_id), None)
    if reserve:
        return jsonify(reserve)
    return jsonify({"error": "Заповедник не найден"}), 404


@app.route('/api/reserves/<int:reserve_id>/animals', methods=['GET'])
def get_reserve_animals(reserve_id):
    """Получить список животных для конкретного заповедника из базы данных."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, name, species, description FROM animals WHERE reserve_id = ?",
        (reserve_id,),
    )
    rows = cur.fetchall()
    conn.close()

    animals = [
        {
            "id": row["id"],
            "name": row["name"],
            "species": row["species"],
            "description": row["description"],
        }
        for row in rows
    ]
    return jsonify(animals)


@app.route('/api/reserves/<int:reserve_id>/cabins', methods=['GET'])
def get_reserve_cabins(reserve_id):
    """Получить список доступных домиков для выбранного заповедника из базы данных."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, name, name_en, description, description_en, capacity, price_per_night, source_url, amenities, amenities_en, details, image FROM cabins WHERE reserve_id = ?",
        (reserve_id,),
    )
    rows = cur.fetchall()
    conn.close()

    cabins = [
        {
            "id": row["id"],
            "name": row["name"],
            "name_en": row["name_en"] or row["name"],
            "description": row["description"],
            "description_en": row["description_en"] or row["description"],
            "capacity": row["capacity"],
            "price_per_night": row["price_per_night"],
            "source_url": row["source_url"],
            "amenities": row["amenities"] if "amenities" in row.keys() else None,
            "amenities_en": row["amenities_en"] if "amenities_en" in row.keys() else None,
            "details": row["details"] if "details" in row.keys() else None,
            "image": row["image"] if "image" in row.keys() else None,
        }
        for row in rows
    ]
    return jsonify(cabins)


@app.route('/api/reserves/<int:reserve_id>/bookings', methods=['POST'])
def create_booking(reserve_id):
    """Создать бронирование домика в заповеднике и сохранить его в БД."""
    data = request.get_json() or {}

    required_fields = [
        "cabin_name",
        "guest_name",
        "guest_email",
        "start_date",
        "end_date",
        "guests",
    ]
    missing = [f for f in required_fields if not data.get(f)]
    if missing:
        return (
            jsonify(
                {
                    "error": "Отсутствуют обязательные поля",
                    "missing": missing,
                }
            ),
            400,
        )

    try:
        guests = int(data.get("guests"))
    except (TypeError, ValueError):
        return jsonify({"error": "Поле 'guests' должно быть числом"}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO bookings (
            reserve_id,
            cabin_name,
            guest_name,
            guest_email,
            start_date,
            end_date,
            guests,
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            reserve_id,
            data.get("cabin_name"),
            data.get("guest_name"),
            data.get("guest_email"),
            data.get("start_date"),
            data.get("end_date"),
            guests,
            datetime.utcnow().isoformat(),
        ),
    )
    conn.commit()
    conn.close()

    return jsonify({"status": "ok", "message": "Бронирование сохранено"}), 201


@app.route('/api/users/register', methods=['POST'])
def register_user():
    """Регистрация нового пользователя."""
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name or not email or not password:
        return jsonify({"error": "Имя, email и пароль обязательны"}), 400
    if len(password) < 6:
        return jsonify({"error": "Пароль должен быть не короче 6 символов"}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT id FROM users WHERE email = ?", (email,))
    if cur.fetchone():
        conn.close()
        return jsonify({"error": "Пользователь с таким email уже существует"}), 400

    salt, pwd_hash = hash_password(password)
    cur.execute(
        """
        INSERT INTO users (name, email, password_salt, password_hash, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (name, email, salt, pwd_hash, datetime.utcnow().isoformat())
    )
    user_id = cur.lastrowid
    
    # Создаем приветственное уведомление
    cur.execute(
        """
        INSERT INTO notifications (user_id, title, message, is_read, created_at)
        VALUES (?, ?, ?, 0, ?)
        """,
        (
            user_id,
            "Добро пожаловать!",
            "Спасибо за регистрацию на портале Экология и мир. Изучайте заповедники Беларуси!",
            datetime.utcnow().isoformat()
        )
    )
    
    # Добавляем начальную активность
    cur.execute(
        """
        INSERT INTO user_activity (user_id, activity_type, title, url, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (user_id, 'page_view', 'Регистрация аккаунта', '/account', datetime.utcnow().isoformat())
    )
    
    conn.commit()
    conn.close()

    return jsonify({"id": user_id, "name": name, "email": email}), 201


@app.route('/api/users/login', methods=['POST'])
def login_user():
    """Авторизация пользователя по email и паролю."""
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email и пароль обязательны"}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, name, email, password_salt, password_hash, favorite_reserve_id, is_admin FROM users WHERE email = ?",
        (email,),
    )
    row = cur.fetchone()
    conn.close()

    if not row or not verify_password(password, row["password_salt"], row["password_hash"]):
        return jsonify({"error": "Неверный email или пароль"}), 401

    return jsonify(build_user_payload(row))


def _oauth_provider_config(provider: str) -> Optional[dict]:
    if provider == "google":
        if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
            return None
        return {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
            "token_url": "https://oauth2.googleapis.com/token",
            "scope": "openid email profile",
        }
    if provider == "vk":
        if not VK_CLIENT_ID or not VK_CLIENT_SECRET:
            return None
        return {
            "client_id": VK_CLIENT_ID,
            "client_secret": VK_CLIENT_SECRET,
            "auth_url": "https://oauth.vk.com/authorize",
            "token_url": "https://oauth.vk.com/access_token",
            "scope": "email",
        }
    if provider == "github":
        if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
            return None
        return {
            "client_id": GITHUB_CLIENT_ID,
            "client_secret": GITHUB_CLIENT_SECRET,
            "auth_url": "https://github.com/login/oauth/authorize",
            "token_url": "https://github.com/login/oauth/access_token",
            "scope": "read:user user:email",
        }
    return None


@app.route('/api/oauth/<provider>/start', methods=['GET'])
def oauth_start(provider):
    provider = (provider or "").strip().lower()
    cfg = _oauth_provider_config(provider)
    if not cfg:
        return jsonify({"error": f"OAuth для '{provider}' не настроен. Проверьте переменные окружения."}), 400

    _cleanup_oauth_stores()
    state = secrets.token_urlsafe(24)
    OAUTH_STATE_STORE[state] = {"provider": provider, "created_at": time.time()}
    redirect_uri = f"{BACKEND_URL}/api/oauth/{provider}/callback"

    if provider == "google":
        query = {
            "client_id": cfg["client_id"],
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": cfg["scope"],
            "state": state,
            "prompt": "select_account",
            "access_type": "online",
        }
    elif provider == "vk":
        query = {
            "client_id": cfg["client_id"],
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": cfg["scope"],
            "v": "5.131",
            "state": state,
        }
    else:  # github
        query = {
            "client_id": cfg["client_id"],
            "redirect_uri": redirect_uri,
            "scope": cfg["scope"],
            "state": state,
        }

    return redirect(f"{cfg['auth_url']}?{urllib.parse.urlencode(query)}")


@app.route('/api/oauth/result', methods=['GET'])
def oauth_result():
    _cleanup_oauth_stores()
    code = (request.args.get("code") or "").strip()
    if not code:
        return jsonify({"error": "code обязателен"}), 400
    result = OAUTH_RESULT_STORE.pop(code, None)
    if not result:
        return jsonify({"error": "OAuth-код истёк или не найден"}), 404
    return jsonify(result["user"])


@app.route('/api/oauth/<provider>/callback', methods=['GET'])
def oauth_callback(provider):
    provider = (provider or "").strip().lower()
    oauth_error = request.args.get("error")
    if oauth_error:
        err = urllib.parse.quote(oauth_error)
        return redirect(f"{FRONTEND_URL}/account?oauth_error={err}")

    state = (request.args.get("state") or "").strip()
    code = (request.args.get("code") or "").strip()
    if not state or not code:
        return redirect(f"{FRONTEND_URL}/account?oauth_error=missing_code_or_state")

    _cleanup_oauth_stores()
    state_info = OAUTH_STATE_STORE.pop(state, None)
    if not state_info or state_info.get("provider") != provider:
        return redirect(f"{FRONTEND_URL}/account?oauth_error=invalid_state")

    cfg = _oauth_provider_config(provider)
    if not cfg:
        return redirect(f"{FRONTEND_URL}/account?oauth_error=provider_not_configured")

    redirect_uri = f"{BACKEND_URL}/api/oauth/{provider}/callback"

    try:
        if provider == "google":
            token = _http_json(
                cfg["token_url"],
                method="POST",
                data={
                    "client_id": cfg["client_id"],
                    "client_secret": cfg["client_secret"],
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": redirect_uri,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            access_token = token.get("access_token")
            profile = _http_json(
                "https://openidconnect.googleapis.com/v1/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            provider_user_id = str(profile.get("sub") or "")
            email = (profile.get("email") or "").strip().lower()
            name = (profile.get("name") or profile.get("given_name") or "").strip()

        elif provider == "vk":
            token = _http_json(
                f"{cfg['token_url']}?{urllib.parse.urlencode({'client_id': cfg['client_id'], 'client_secret': cfg['client_secret'], 'redirect_uri': redirect_uri, 'code': code})}"
            )
            access_token = token.get("access_token")
            provider_user_id = str(token.get("user_id") or "")
            email = (token.get("email") or f"vk_{provider_user_id}@oauth.local").strip().lower()
            profile = _http_json(
                f"https://api.vk.com/method/users.get?{urllib.parse.urlencode({'user_ids': provider_user_id, 'access_token': access_token, 'v': '5.131'})}"
            )
            users = profile.get("response") or []
            if users:
                first = users[0]
                name = f"{first.get('first_name', '')} {first.get('last_name', '')}".strip()
            else:
                name = f"VK User {provider_user_id}"

        else:  # github
            token = _http_json(
                cfg["token_url"],
                method="POST",
                data={
                    "client_id": cfg["client_id"],
                    "client_secret": cfg["client_secret"],
                    "code": code,
                    "redirect_uri": redirect_uri,
                },
                headers={"Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded"},
            )
            access_token = token.get("access_token")
            profile = _http_json(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/vnd.github+json",
                    "User-Agent": "ecology-and-world-oauth",
                },
            )
            provider_user_id = str(profile.get("id") or "")
            name = (profile.get("name") or profile.get("login") or "").strip()
            email = (profile.get("email") or "").strip().lower()
            if not email:
                emails = _http_json(
                    "https://api.github.com/user/emails",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Accept": "application/vnd.github+json",
                        "User-Agent": "ecology-and-world-oauth",
                    },
                )
                if isinstance(emails, list):
                    primary = next((x for x in emails if x.get("primary")), None) or (emails[0] if emails else None)
                    email = (primary or {}).get("email", "").strip().lower()
            if not email:
                email = f"github_{provider_user_id}@oauth.local"

        if not provider_user_id:
            return redirect(f"{FRONTEND_URL}/account?oauth_error=provider_user_missing")

        user_payload = _get_or_create_oauth_user(provider, provider_user_id, email, name)
        result_code = secrets.token_urlsafe(24)
        OAUTH_RESULT_STORE[result_code] = {"user": user_payload, "created_at": time.time()}
        return redirect(f"{FRONTEND_URL}/account?oauth_code={urllib.parse.quote(result_code)}")
    except Exception as exc:
        return redirect(f"{FRONTEND_URL}/account?oauth_error={urllib.parse.quote(str(exc)[:120])}")


@app.route('/api/users/<int:user_id>', methods=['PATCH'])
def update_user(user_id):
    """Обновить имя пользователя."""
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Имя не может быть пустым"}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("UPDATE users SET name = ? WHERE id = ?", (name, user_id))
    conn.commit()
    if cur.rowcount == 0:
        conn.close()
        return jsonify({"error": "Пользователь не найден"}), 404
    conn.close()
    return jsonify({"id": user_id, "name": name})


@app.route('/api/users/<int:user_id>/password', methods=['PATCH'])
def update_user_password(user_id):
    """Сменить пароль пользователя."""
    data = request.get_json() or {}
    current_password = data.get("current_password") or ""
    new_password = data.get("new_password") or ""

    if not current_password or not new_password:
        return jsonify({"error": "Текущий и новый пароль обязательны"}), 400
    if len(new_password) < 6:
        return jsonify({"error": "Новый пароль должен быть не короче 6 символов"}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT password_salt, password_hash FROM users WHERE id = ?",
        (user_id,),
    )
    row = cur.fetchone()
    if not row or not verify_password(current_password, row["password_salt"], row["password_hash"]):
        conn.close()
        return jsonify({"error": "Неверный текущий пароль"}), 401

    salt, pwd_hash = hash_password(new_password)
    cur.execute(
        "UPDATE users SET password_salt = ?, password_hash = ? WHERE id = ?",
        (salt, pwd_hash, user_id),
    )
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


@app.route('/api/users/<int:user_id>/feedback', methods=['GET'])
def get_user_feedback(user_id):
    """Список обращений пользователя."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, message, reply, reply_at, created_at FROM feedback WHERE user_id = ? ORDER BY created_at DESC",
        (user_id,),
    )
    rows = cur.fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route('/api/users/<int:user_id>/feedback', methods=['DELETE'])
def clear_user_feedback(user_id):
    """Очистить все обращения пользователя."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM feedback WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"}), 200


@app.route('/api/users/<int:user_id>/bookings', methods=['GET'])
def get_user_bookings(user_id):
    """Бронирования пользователя (по совпадению email)."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT email FROM users WHERE id = ?", (user_id,))
    row = cur.fetchone()
    if not row:
        conn.close()
        return jsonify([])
    email = row["email"]
    cur.execute(
        """SELECT id, reserve_id, cabin_name, guest_name, start_date, end_date, guests, created_at
           FROM bookings WHERE guest_email = ? ORDER BY created_at DESC""",
        (email,),
    )
    rows = cur.fetchall()
    conn.close()
    reserves_by_id = {r["id"]: r for r in RESERVES_DATA}
    return jsonify([
        {
            "id": r["id"],
            "reserve_id": r["reserve_id"],
            "reserve_name": reserves_by_id.get(r["reserve_id"], {}).get("name", ""),
            "cabin_name": r["cabin_name"],
            "guest_name": r["guest_name"],
            "start_date": r["start_date"],
            "end_date": r["end_date"],
            "guests": r["guests"],
            "created_at": r["created_at"],
        }
        for r in rows
    ])


@app.route('/api/users/<int:user_id>/bookings', methods=['DELETE'])
def clear_user_bookings(user_id):
    """Очистить все бронирования пользователя."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT email FROM users WHERE id = ?", (user_id,))
    row = cur.fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Пользователь не найден"}), 404
    cur.execute("DELETE FROM bookings WHERE guest_email = ?", (row["email"],))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"}), 200


@app.route('/api/users/<int:user_id>/favorites', methods=['GET'])
def get_user_favorites(user_id):
    """Получить список избранных заповедников пользователя."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT reserve_id FROM favorites WHERE user_id = ?", (user_id,))
    rows = cur.fetchall()

    cur.execute("SELECT favorite_reserve_id FROM users WHERE id = ?", (user_id,))
    user_row = cur.fetchone()
    conn.close()

    reserve_ids = [int(r["reserve_id"]) for r in rows]
    reserves_by_id = {r["id"]: r for r in RESERVES_DATA}
    favorites = [reserves_by_id[rid] for rid in reserve_ids if rid in reserves_by_id]

    fav_id = None
    if user_row and user_row["favorite_reserve_id"] is not None:
        fav_id = int(user_row["favorite_reserve_id"])

    return jsonify(
        {
            "favorites": favorites,
            "favorite_reserve_id": fav_id,
        }
    )


@app.route('/api/users/<int:user_id>/favorites', methods=['POST'])
def add_user_favorite(user_id):
    """Добавить заповедник в избранное пользователя."""
    data = request.get_json() or {}
    try:
        reserve_id = int(data.get("reserve_id"))
    except (TypeError, ValueError):
        return jsonify({"error": "reserve_id должен быть числом"}), 400

    if not any(r["id"] == reserve_id for r in RESERVES_DATA):
        return jsonify({"error": "Заповедник не найден"}), 404

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT OR IGNORE INTO favorites (user_id, reserve_id, created_at)
        VALUES (?, ?, ?)
        """,
        (user_id, reserve_id, datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()

    return get_user_favorites(user_id)


@app.route('/api/users/<int:user_id>/favorites/<int:reserve_id>', methods=['DELETE'])
def remove_user_favorite(user_id, reserve_id):
    """Удалить заповедник из избранного пользователя."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "DELETE FROM favorites WHERE user_id = ? AND reserve_id = ?",
        (user_id, reserve_id),
    )
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"}), 200


@app.route('/api/users/<int:user_id>/favorite-reserve', methods=['PATCH'])
def set_user_favorite_reserve(user_id):
    """Установить основной (любимый) заповедник пользователя."""
    data = request.get_json() or {}
    reserve_id = data.get("reserve_id")

    if reserve_id is not None and not any(r["id"] == reserve_id for r in RESERVES_DATA):
        return jsonify({"error": "Заповедник не найден"}), 404

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE users SET favorite_reserve_id = ? WHERE id = ?",
        (reserve_id, user_id),
    )
    conn.commit()
    conn.close()
    return jsonify({"status": "ok", "favorite_reserve_id": reserve_id})


@app.route('/api/feedback', methods=['POST'])
def create_feedback():
    """Сохранить сообщение обратной связи от пользователя или гостя."""
    data = request.get_json() or {}
    message = (data.get("message") or "").strip()
    if not message:
        return jsonify({"error": "Текст сообщения обязателен"}), 400

    user_id = data.get("user_id")
    name = (data.get("name") or "").strip() or None
    email = (data.get("email") or "").strip() or None

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO feedback (user_id, name, email, message, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (user_id, name, email, message, datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()

    return jsonify({"status": "ok", "message": "Сообщение отправлено"}), 201


@app.route('/api/users/<int:user_id>/activity', methods=['GET'])
def get_user_activity(user_id):
    """Получить историю активности пользователя."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT * FROM user_activity WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
        (user_id,)
    )
    rows = cur.fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])


@app.route('/api/users/<int:user_id>/activity', methods=['POST'])
def log_user_activity(user_id):
    """Записать активность пользователя."""
    data = request.get_json() or {}
    activity_type = data.get('activity_type')  # 'page_view' or 'search'
    title = data.get('title')
    url = data.get('url', '')
    
    if not activity_type or not title:
        return jsonify({"error": "activity_type и title обязательны"}), 400
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Проверяем, существует ли пользователь
    cur.execute("SELECT id FROM users WHERE id = ?", (user_id,))
    if not cur.fetchone():
        conn.close()
        return jsonify({"error": "Пользователь не найден"}), 404
    
    cur.execute(
        """
        INSERT INTO user_activity (user_id, activity_type, title, url, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (user_id, activity_type, title, url, datetime.utcnow().isoformat())
    )
    conn.commit()
    conn.close()
    
    return jsonify({"status": "ok"}), 201


@app.route('/api/users/<int:user_id>/activity', methods=['DELETE'])
def clear_user_activity(user_id):
    """Очистить историю активности пользователя."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM user_activity WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"}), 200


@app.route('/api/users/<int:user_id>/notifications', methods=['GET'])
def get_user_notifications(user_id):
    """Получить уведомления пользователя."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20",
        (user_id,)
    )
    rows = cur.fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])


@app.route('/api/users/<int:user_id>/notifications/<int:notification_id>/read', methods=['PATCH'])
def mark_notification_read(user_id, notification_id):
    """Отметить уведомление как прочитанное."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
        (notification_id, user_id)
    )
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"}), 200


@app.route('/api/users/<int:user_id>/notifications', methods=['DELETE'])
def clear_user_notifications(user_id):
    """Очистить все уведомления пользователя."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM notifications WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"}), 200


@app.route('/api/users/<int:user_id>/privacy', methods=['GET'])
def get_privacy_settings(user_id):
    """Получить настройки приватности пользователя."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM privacy_settings WHERE user_id = ?", (user_id,))
    row = cur.fetchone()
    
    if not row:
        # Создать настройки по умолчанию
        cur.execute(
            "INSERT INTO privacy_settings (user_id) VALUES (?)",
            (user_id,)
        )
        conn.commit()
        cur.execute("SELECT * FROM privacy_settings WHERE user_id = ?", (user_id,))
        row = cur.fetchone()
    
    conn.close()
    return jsonify(dict(row) if row else {})


@app.route('/api/users/<int:user_id>/privacy', methods=['PATCH'])
def update_privacy_settings(user_id):
    """Обновить настройки приватности пользователя."""
    data = request.get_json() or {}
    show_activity = 1 if data.get('show_activity') else 0
    show_favorites = 1 if data.get('show_favorites') else 0
    allow_notifications = 1 if data.get('allow_notifications') else 0
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Проверяем, существуют ли настройки
    cur.execute("SELECT user_id FROM privacy_settings WHERE user_id = ?", (user_id,))
    exists = cur.fetchone()
    
    if exists:
        # Обновляем существующие настройки
        cur.execute(
            """
            UPDATE privacy_settings 
            SET show_activity = ?, show_favorites = ?, allow_notifications = ?
            WHERE user_id = ?
            """,
            (show_activity, show_favorites, allow_notifications, user_id)
        )
    else:
        # Создаем новые настройки
        cur.execute(
            """
            INSERT INTO privacy_settings (user_id, show_activity, show_favorites, allow_notifications)
            VALUES (?, ?, ?, ?)
            """,
            (user_id, show_activity, show_favorites, allow_notifications)
        )
    
    conn.commit()
    conn.close()
    
    return jsonify({
        "status": "ok",
        "show_activity": bool(show_activity),
        "show_favorites": bool(show_favorites),
        "allow_notifications": bool(allow_notifications)
    })


@app.route('/api/reserves/<int:reserve_id>/weather', methods=['GET'])
def get_reserve_weather(reserve_id):
    """Получить прогноз погоды для заповедника на неделю."""
    reserve = next((r for r in RESERVES_DATA if r['id'] == reserve_id), None)
    if not reserve:
        return jsonify({"error": "Заповедник не найден"}), 404
    
    lat = reserve['location']['lat']
    lng = reserve['location']['lng']
    
    try:
        # Используем Open-Meteo API (бесплатный, без ключа)
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weathercode&timezone=Europe/Minsk&forecast_days=7"
        
        with urllib.request.urlopen(url, timeout=10) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                
                # Преобразуем данные в удобный формат
                daily = data.get('daily', {})
                forecast = []
                
                for i in range(len(daily.get('time', []))):
                    forecast.append({
                        'date': daily['time'][i],
                        'temp_max': daily['temperature_2m_max'][i],
                        'temp_min': daily['temperature_2m_min'][i],
                        'precipitation': daily['precipitation_sum'][i],
                        'wind_speed': daily['windspeed_10m_max'][i],
                        'weather_code': daily['weathercode'][i]
                    })
                
                # Добавляем рекомендации для посещения
                recommendations = get_visit_recommendations(forecast)
                
                return jsonify({
                    'reserve_name': reserve['name'],
                    'forecast': forecast,
                    'recommendations': recommendations
                })
    except Exception as e:
        return jsonify({"error": f"Не удалось получить данные о погоде: {str(e)}"}), 500


def get_visit_recommendations(forecast):
    """Генерировать рекомендации для посещения на основе прогноза погоды."""
    recommendations = {
        'best_days': [],
        'caution_days': [],
        'general_advice': []
    }
    
    for i, day in enumerate(forecast):
        day_name = ['Сегодня', 'Завтра', 'Послезавтра'][i] if i < 3 else f'День {i+1}'
        
        # Хорошие дни для посещения
        if (day['temp_max'] > 15 and day['temp_max'] < 28 and 
            day['precipitation'] < 2 and day['wind_speed'] < 20):
            recommendations['best_days'].append({
                'day': day_name,
                'date': day['date'],
                'reason': 'Отличная погода для прогулок и экскурсий'
            })
        
        # Дни требующие осторожности
        if day['precipitation'] > 10:
            recommendations['caution_days'].append({
                'day': day_name,
                'date': day['date'],
                'reason': 'Ожидается сильный дождь, возьмите дождевик'
            })
        elif day['temp_max'] > 30:
            recommendations['caution_days'].append({
                'day': day_name,
                'date': day['date'],
                'reason': 'Жаркая погода, не забудьте воду и головной убор'
            })
        elif day['temp_max'] < 5:
            recommendations['caution_days'].append({
                'day': day_name,
                'date': day['date'],
                'reason': 'Холодная погода, оденьтесь теплее'
            })
        elif day['wind_speed'] > 30:
            recommendations['caution_days'].append({
                'day': day_name,
                'date': day['date'],
                'reason': 'Сильный ветер, будьте осторожны на открытых участках'
            })
    
    # Общие советы
    avg_temp = sum(d['temp_max'] for d in forecast) / len(forecast)
    total_precip = sum(d['precipitation'] for d in forecast)
    
    if avg_temp > 20:
        recommendations['general_advice'].append('Возьмите с собой солнцезащитный крем и головной убор')
    if avg_temp < 10:
        recommendations['general_advice'].append('Рекомендуется теплая одежда и термос с горячим напитком')
    if total_precip > 20:
        recommendations['general_advice'].append('На этой неделе ожидаются дожди, возьмите непромокаемую обувь')
    if not recommendations['best_days']:
        recommendations['general_advice'].append('Погода переменчивая, будьте готовы к любым условиям')
    
    return recommendations


@app.route('/api/users/<int:user_id>/profile', methods=['GET'])
def get_user_profile(user_id):
    """Получить профиль пользователя."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, name, email, bio, location, avatar, created_at FROM users WHERE id = ?",
        (user_id,)
    )
    row = cur.fetchone()
    conn.close()
    
    if not row:
        return jsonify({"error": "Пользователь не найден"}), 404
    
    return jsonify(dict(row))


@app.route('/api/users/<int:user_id>/profile', methods=['PATCH'])
def update_user_profile(user_id):
    """Обновить профиль пользователя с возможностью загрузки аватара."""
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Проверяем существование пользователя
    cur.execute("SELECT id, avatar FROM users WHERE id = ?", (user_id,))
    user = cur.fetchone()
    if not user:
        conn.close()
        return jsonify({"error": "Пользователь не найден"}), 404
    
    # Получаем данные из формы
    name = request.form.get('name', '').strip()
    bio = request.form.get('bio', '').strip()
    location = request.form.get('location', '').strip()
    
    if not name:
        conn.close()
        return jsonify({"error": "Имя обязательно"}), 400
    
    # Обработка аватара
    avatar_path = user['avatar']  # Сохраняем старый путь
    
    if 'avatar' in request.files:
        file = request.files['avatar']
        if file and file.filename and allowed_file(file.filename):
            # Удаляем старый аватар, если он есть
            if avatar_path:
                old_file_path = os.path.join(BASE_DIR, avatar_path.lstrip('/'))
                if os.path.exists(old_file_path):
                    try:
                        os.remove(old_file_path)
                    except:
                        pass
            
            # Сохраняем новый аватар
            filename = secure_filename(file.filename)
            unique_filename = f"{user_id}_{datetime.utcnow().timestamp()}_{filename}"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(file_path)
            avatar_path = f"/uploads/avatars/{unique_filename}"
    
    # Обновляем профиль
    cur.execute(
        """
        UPDATE users 
        SET name = ?, bio = ?, location = ?, avatar = ?
        WHERE id = ?
        """,
        (name, bio, location, avatar_path, user_id)
    )
    conn.commit()
    conn.close()
    
    return jsonify({
        "status": "ok",
        "name": name,
        "bio": bio,
        "location": location,
        "avatar": avatar_path
    })


@app.route('/uploads/avatars/<filename>')
def serve_avatar(filename):
    """Отдать файл аватара."""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


@app.route('/images/reserves/<filename>')
def serve_reserve_image(filename):
    """Отдать изображение заповедника."""
    images_dir = os.path.join(os.path.dirname(BASE_DIR), 'public', 'images', 'reserves')
    return send_from_directory(images_dir, filename)


@app.route('/images/backgrounds/<filename>')
def serve_background_image(filename):
    """Отдать фоновое изображение."""
    images_dir = os.path.join(os.path.dirname(BASE_DIR), 'public', 'images', 'backgrounds')
    return send_from_directory(images_dir, filename)


@app.route('/api/health', methods=['GET'])
def health_check():
    """Проверка работоспособности API"""
    return jsonify({"status": "ok", "message": "API работает корректно"})


# ── ECOLOGY TOPICS ───────────────────────────────────────────

@app.route('/api/ecology/topics', methods=['GET'])
def get_ecology_topics():
    """Получить все темы экологии."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM ecology_topics ORDER BY sort_order ASC")
    rows = cur.fetchall()
    conn.close()
    result = []
    for row in rows:
        d = dict(row)
        for field in ('paragraphs_ru', 'paragraphs_en'):
            raw = d[field] or ''
            raw = raw.strip()
            if raw.startswith('['):
                try:
                    d[field] = json.loads(raw)
                except Exception:
                    d[field] = [p for p in raw.split('\n') if p.strip()]
            else:
                d[field] = [p for p in raw.split('\n') if p.strip()]
        result.append(d)
    return jsonify(result)


@app.route('/api/admin/ecology/topics', methods=['POST'])
def admin_create_ecology_topic():
    """Создать новую тему экологии."""
    data = request.get_json() or {}
    required = ['id', 'title_ru', 'title_en', 'content_title_ru', 'content_title_en']
    if any(not data.get(f) for f in required):
        return jsonify({"error": "Обязательные поля: id, title_ru, title_en, content_title_ru, content_title_en"}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id FROM ecology_topics ORDER BY sort_order DESC LIMIT 1")
    last = cur.fetchone()
    next_order = (last['sort_order'] + 1) if last else 1

    paragraphs_ru = '\n'.join(data.get('paragraphs_ru', []))
    paragraphs_en = '\n'.join(data.get('paragraphs_en', []))

    try:
        cur.execute("""
            INSERT INTO ecology_topics (id, icon, title_ru, title_en, content_title_ru, content_title_en, paragraphs_ru, paragraphs_en, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data['id'], data.get('icon', '🌿'),
            data['title_ru'], data['title_en'],
            data['content_title_ru'], data['content_title_en'],
            paragraphs_ru, paragraphs_en, next_order
        ))
        conn.commit()
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 400
    conn.close()
    return jsonify({"status": "ok"}), 201


@app.route('/api/admin/ecology/topics/<topic_id>', methods=['PATCH'])
def admin_update_ecology_topic(topic_id):
    """Обновить тему экологии."""
    data = request.get_json() or {}
    paragraphs_ru = '\n'.join(data.get('paragraphs_ru', []))
    paragraphs_en = '\n'.join(data.get('paragraphs_en', []))

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        UPDATE ecology_topics
        SET icon=?, title_ru=?, title_en=?, content_title_ru=?, content_title_en=?,
            paragraphs_ru=?, paragraphs_en=?
        WHERE id=?
    """, (
        data.get('icon'), data.get('title_ru'), data.get('title_en'),
        data.get('content_title_ru'), data.get('content_title_en'),
        paragraphs_ru, paragraphs_en, topic_id
    ))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


@app.route('/api/admin/ecology/topics/<topic_id>', methods=['DELETE'])
def admin_delete_ecology_topic(topic_id):
    """Удалить тему экологии."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM ecology_topics WHERE id=?", (topic_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


# ── EXCURSIONS ───────────────────────────────────────────────

@app.route('/api/reserves/<int:reserve_id>/excursions', methods=['GET'])
def get_reserve_excursions(reserve_id):
    """Список экскурсий заповедника."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT e.*,
               (SELECT COALESCE(SUM(r.guests), 0) FROM excursion_registrations r WHERE r.excursion_id = e.id) AS registered
        FROM excursions e
        WHERE e.reserve_id = ?
        ORDER BY e.date ASC, e.time ASC
    """, (reserve_id,))
    rows = cur.fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route('/api/excursions/<int:excursion_id>/register', methods=['POST'])
def register_excursion(excursion_id):
    """Записаться на экскурсию."""
    data = request.get_json() or {}
    guest_name  = (data.get('guest_name') or '').strip()
    guest_email = (data.get('guest_email') or '').strip().lower()
    guests      = int(data.get('guests', 1))
    user_id     = data.get('user_id')

    if not guest_name or not guest_email:
        return jsonify({"error": "Имя и email обязательны"}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT * FROM excursions WHERE id = ?", (excursion_id,))
    exc = cur.fetchone()
    if not exc:
        conn.close()
        return jsonify({"error": "Экскурсия не найдена"}), 404

    # Проверяем свободные места
    cur.execute("SELECT COALESCE(SUM(guests),0) AS total FROM excursion_registrations WHERE excursion_id = ?", (excursion_id,))
    total = cur.fetchone()["total"]
    if total + guests > exc["max_participants"]:
        conn.close()
        return jsonify({"error": "Недостаточно свободных мест"}), 400

    try:
        cur.execute("""
            INSERT INTO excursion_registrations (excursion_id, user_id, guest_name, guest_email, guests, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (excursion_id, user_id, guest_name, guest_email, guests, datetime.utcnow().isoformat()))
        conn.commit()
    except Exception:
        conn.close()
        return jsonify({"error": "Вы уже записаны на эту экскурсию"}), 400

    # Уведомление пользователю
    if user_id:
        cur.execute("""
            INSERT INTO notifications (user_id, title, message, is_read, created_at)
            VALUES (?, ?, ?, 0, ?)
        """, (user_id, "Запись на экскурсию подтверждена",
              f"Вы записаны на экскурсию «{exc['title']}» {exc['date']} в {exc['time']}.",
              datetime.utcnow().isoformat()))
        conn.commit()

    conn.close()
    return jsonify({"status": "ok"}), 201


@app.route('/api/excursions/<int:excursion_id>/cancel', methods=['DELETE'])
def cancel_excursion(excursion_id):
    """Отменить запись на экскурсию."""
    data = request.get_json() or {}
    guest_email = (data.get('guest_email') or '').strip().lower()
    if not guest_email:
        return jsonify({"error": "Email обязателен"}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM excursion_registrations WHERE excursion_id = ? AND guest_email = ?",
                (excursion_id, guest_email))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


@app.route('/api/users/<int:user_id>/excursions', methods=['GET'])
def get_user_excursions(user_id):
    """Экскурсии пользователя."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT email FROM users WHERE id = ?", (user_id,))
    row = cur.fetchone()
    if not row:
        conn.close()
        return jsonify([])
    email = row["email"]
    cur.execute("""
        SELECT r.id, r.guests, r.created_at,
               e.id AS excursion_id, e.title, e.date, e.time, e.duration,
               e.guide, e.price, e.reserve_id,
               (SELECT name FROM users WHERE id = 0) AS reserve_name
        FROM excursion_registrations r
        JOIN excursions e ON r.excursion_id = e.id
        WHERE r.guest_email = ?
        ORDER BY e.date ASC
    """, (email,))
    rows = cur.fetchall()
    conn.close()
    reserves_by_id = {r["id"]: r["name"] for r in RESERVES_DATA}
    result = []
    for row in rows:
        d = dict(row)
        d["reserve_name"] = reserves_by_id.get(d["reserve_id"], "")
        result.append(d)
    return jsonify(result)


# ── ADMIN ENDPOINTS ──────────────────────────────────────────

@app.route('/api/admin/feedback', methods=['GET'])
def admin_get_all_feedback():
    """Получить все обращения (для админа)."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT f.id, f.user_id, f.name, f.email, f.message, f.reply, f.reply_at, f.created_at,
               u.name AS user_name
        FROM feedback f
        LEFT JOIN users u ON f.user_id = u.id
        ORDER BY f.created_at DESC
    """)
    rows = cur.fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route('/api/admin/feedback/<int:feedback_id>/reply', methods=['PATCH'])
def admin_reply_feedback(feedback_id):
    """Ответить на обращение пользователя."""
    data = request.get_json() or {}
    reply = (data.get("reply") or "").strip()
    if not reply:
        return jsonify({"error": "Текст ответа обязателен"}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE feedback SET reply = ?, reply_at = ? WHERE id = ?",
        (reply, datetime.utcnow().isoformat(), feedback_id)
    )
    conn.commit()

    # Создаём уведомление пользователю если он зарегистрирован
    cur.execute("SELECT user_id, message FROM feedback WHERE id = ?", (feedback_id,))
    row = cur.fetchone()
    if row and row["user_id"]:
        cur.execute("""
            INSERT INTO notifications (user_id, title, message, is_read, created_at)
            VALUES (?, ?, ?, 0, ?)
        """, (
            row["user_id"],
            "Ответ на ваше обращение",
            f"Администратор ответил на ваше обращение: «{row['message'][:60]}{'...' if len(row['message']) > 60 else ''}»",
            datetime.utcnow().isoformat()
        ))
        conn.commit()

    conn.close()
    return jsonify({"status": "ok"})


@app.route('/api/admin/reserves/<int:reserve_id>', methods=['PATCH'])
def admin_update_reserve(reserve_id):
    """Обновить данные заповедника (описание, особенности)."""
    data = request.get_json() or {}
    reserve = next((r for r in RESERVES_DATA if r['id'] == reserve_id), None)
    if not reserve:
        return jsonify({"error": "Заповедник не найден"}), 404

    if 'description' in data:
        reserve['description'] = data['description']
    if 'features' in data and isinstance(data['features'], list):
        reserve['features'] = data['features']
    if 'name' in data:
        reserve['name'] = data['name']

    return jsonify(reserve)


@app.route('/api/admin/users', methods=['GET'])
def admin_get_users():
    """Получить список всех пользователей."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, name, email, is_admin, created_at FROM users ORDER BY created_at DESC")
    rows = cur.fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route('/api/admin/excursions', methods=['POST'])
def admin_create_excursion():
    """Создать экскурсию."""
    data = request.get_json() or {}
    required = ['reserve_id', 'title', 'date', 'time']
    if any(not data.get(f) for f in required):
        return jsonify({"error": "reserve_id, title, date, time обязательны"}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO excursions (reserve_id, title, description, what_to_expect, route, guide, date, time, duration, max_participants, price, image)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            data.get('reserve_id'),
            data.get('title'),
            data.get('description'),
            data.get('what_to_expect'),
            data.get('route'),
            data.get('guide'),
            data.get('date'),
            data.get('time'),
            data.get('duration', '2 часа'),
            data.get('max_participants', 20),
            data.get('price', 0),
            data.get('image'),
        ),
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return jsonify({"status": "ok", "id": new_id}), 201


@app.route('/api/admin/excursions/<int:excursion_id>', methods=['PATCH'])
def admin_update_excursion(excursion_id):
    """Обновить экскурсию."""
    data = request.get_json() or {}
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        UPDATE excursions SET title=?, description=?, guide=?, date=?, time=?, duration=?, max_participants=?, price=?, what_to_expect=?, route=?, title_en=?, description_en=?, guide_en=?, what_to_expect_en=?, route_en=?
        WHERE id=?
    """, (
        data.get('title'), data.get('description'), data.get('guide'),
        data.get('date'), data.get('time'), data.get('duration'),
        int(data.get('max_participants', 20)), float(data.get('price', 0)),
        data.get('what_to_expect'), data.get('route'),
        data.get('title_en'), data.get('description_en'), data.get('guide_en'),
        data.get('what_to_expect_en'), data.get('route_en'),
        excursion_id
    ))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


@app.route('/api/admin/excursions/<int:excursion_id>', methods=['DELETE'])
def admin_delete_excursion(excursion_id):
    """Удалить экскурсию."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM excursion_registrations WHERE excursion_id = ?", (excursion_id,))
    cur.execute("DELETE FROM excursions WHERE id = ?", (excursion_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


@app.route('/api/admin/excursions', methods=['GET'])
def admin_get_excursions():
    """Все экскурсии с количеством записавшихся."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT e.*,
               (SELECT COALESCE(SUM(r.guests), 0) FROM excursion_registrations r WHERE r.excursion_id = e.id) AS registered
        FROM excursions e ORDER BY e.date ASC
    """)
    rows = cur.fetchall()
    conn.close()
    reserves_by_id = {r["id"]: r["name"] for r in RESERVES_DATA}
    result = []
    for row in rows:
        d = dict(row)
        d["reserve_name"] = reserves_by_id.get(d["reserve_id"], "")
        result.append(d)
    return jsonify(result)


@app.route('/api/admin/upload', methods=['POST'])
def admin_upload_image():
    """Загрузка изображения для админа."""
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Add timestamp to avoid conflicts
        timestamp = str(int(time.time()))
        name, ext = os.path.splitext(filename)
        filename = f"{name}_{timestamp}{ext}"
        
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Return the URL to access the uploaded file
        file_url = f"{BACKEND_URL}/uploads/avatars/{filename}"
        return jsonify({"url": file_url}), 200
    
    return jsonify({"error": "Invalid file type"}), 400


# ── ADMIN CABINS & BOOKINGS ──────────────────────────────────

@app.route('/api/admin/cabins', methods=['GET'])
def admin_get_all_cabins():
    """Все домики со всех заповедников."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM cabins ORDER BY reserve_id, id")
    rows = cur.fetchall()
    conn.close()
    reserves_by_id = {r["id"]: r["name"] for r in RESERVES_DATA}
    result = []
    for row in rows:
        d = dict(row)
        d["reserve_name"] = reserves_by_id.get(d["reserve_id"], "")
        result.append(d)
    return jsonify(result)


@app.route('/api/admin/cabins', methods=['POST'])
def admin_create_cabin():
    """Создать новый домик."""
    data = request.get_json() or {}
    if not data.get('reserve_id') or not data.get('name'):
        return jsonify({"error": "reserve_id и name обязательны"}), 400
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO cabins (reserve_id, name, description, capacity, price_per_night, source_url, amenities, details, image)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        int(data['reserve_id']),
        data['name'],
        data.get('description', ''),
        int(data.get('capacity', 2)),
        float(data.get('price_per_night', 0)),
        data.get('source_url', ''),
        data.get('amenities', ''),
        data.get('details', ''),
        data.get('image', ''),
    ))
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return jsonify({"status": "ok", "id": new_id}), 201


@app.route('/api/admin/cabins/<int:cabin_id>', methods=['PATCH'])
def admin_update_cabin(cabin_id):
    """Обновить домик."""
    data = request.get_json() or {}
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        UPDATE cabins SET name=?, description=?, capacity=?, price_per_night=?, source_url=?, amenities=?, details=?, image=?
        WHERE id=?
    """, (
        data.get('name'), data.get('description'),
        int(data.get('capacity', 2)), float(data.get('price_per_night', 0)),
        data.get('source_url', ''), data.get('amenities'), data.get('details'),
        data.get('image'), cabin_id
    ))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"}), 200


@app.route('/api/admin/cabins/<int:cabin_id>', methods=['DELETE'])
def admin_delete_cabin(cabin_id):
    """Удалить домик."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM cabins WHERE id=?", (cabin_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


@app.route('/api/admin/bookings', methods=['GET'])
def admin_get_all_bookings():
    """Все бронирования."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, reserve_id, cabin_name, guest_name, guest_email,
               start_date, end_date, guests, created_at
        FROM bookings ORDER BY created_at DESC
    """)
    rows = cur.fetchall()
    conn.close()
    reserves_by_id = {r["id"]: r["name"] for r in RESERVES_DATA}
    result = []
    for row in rows:
        d = dict(row)
        d["reserve_name"] = reserves_by_id.get(d["reserve_id"], "")
        result.append(d)
    return jsonify(result)


@app.route('/api/admin/bookings/<int:booking_id>', methods=['DELETE'])
def admin_delete_booking(booking_id):
    """Удалить бронирование."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM bookings WHERE id=?", (booking_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


if __name__ == '__main__':
    # Используем порт 5001, чтобы избежать конфликтов с другими службами
    port = int(os.environ.get('PORT', 5001))
    # При старте приложения убедимся, что база инициализирована
    init_db()
    app.run(debug=True, host='0.0.0.0', port=port)

