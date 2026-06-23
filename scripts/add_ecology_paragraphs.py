"""Добавляет 1-2 абзаца к каждой теме экологии."""
import sqlite3, json, os

DB_PATH = os.path.join(os.path.dirname(__file__), 'ecology.db')

# Дополнительные абзацы для каждой темы
EXTRA = {
    "importance": {
        "ru": [
            "Экология как наука возникла в XIX веке, однако её практическое значение резко возросло в XX веке, когда масштабы промышленного воздействия на природу стали угрожающими. Сегодня экологические исследования лежат в основе международной климатической политики, стандартов качества воды и воздуха, а также систем управления природными ресурсами.",
            "Каждый человек ежедневно взаимодействует с экосистемами — через еду, воду, воздух и энергию. Понимание этих связей помогает делать осознанный выбор: от покупки продуктов до голосования за экологически ответственных политиков."
        ],
        "en": [
            "Ecology as a science emerged in the 19th century, but its practical importance grew sharply in the 20th century when the scale of industrial impact on nature became alarming. Today, ecological research underpins international climate policy, water and air quality standards, and natural resource management systems.",
            "Every person interacts with ecosystems daily — through food, water, air and energy. Understanding these connections helps make conscious choices: from buying products to voting for environmentally responsible politicians."
        ]
    },
    "climate": {
        "ru": [
            "Особую роль в борьбе с изменением климата играют природные экосистемы. Леса, болота и океаны поглощают около половины всех выбросов CO₂, производимых человеком. Сохранение и восстановление этих «углеродных депо» — один из самых экономически эффективных способов смягчить климатический кризис.",
            "Изменение климата затрагивает и Беларусь: за последние 30 лет средняя температура в стране выросла примерно на 1 °C, увеличилась частота засух и паводков. Это напрямую влияет на сельское хозяйство, лесное хозяйство и водоснабжение."
        ],
        "en": [
            "Natural ecosystems play a special role in combating climate change. Forests, wetlands and oceans absorb about half of all CO₂ emissions produced by humans. Preserving and restoring these 'carbon sinks' is one of the most cost-effective ways to mitigate the climate crisis.",
            "Climate change also affects Belarus: over the past 30 years, the country's average temperature has risen by about 1 °C, and the frequency of droughts and floods has increased. This directly impacts agriculture, forestry and water supply."
        ]
    },
    "biodiversity": {
        "ru": [
            "Биоразнообразие — это не только эстетическая ценность дикой природы, но и основа продовольственной безопасности. Около 75% мировых продовольственных культур зависят от опыления насекомыми. Сокращение популяций пчёл и других опылителей уже приводит к снижению урожайности в ряде регионов мира.",
            "Генетическое разнообразие внутри видов — страховой полис природы. Чем разнообразнее генофонд популяции, тем выше её устойчивость к болезням, вредителям и изменениям среды. Именно поэтому сохранение диких родственников культурных растений имеет стратегическое значение для будущего сельского хозяйства."
        ],
        "en": [
            "Biodiversity is not only the aesthetic value of wildlife, but also the foundation of food security. About 75% of the world's food crops depend on insect pollination. Declining populations of bees and other pollinators are already reducing yields in some regions.",
            "Genetic diversity within species is nature's insurance policy. The more diverse a population's gene pool, the greater its resilience to diseases, pests and environmental changes. This is why preserving wild relatives of cultivated plants has strategic importance for the future of agriculture."
        ]
    },
    "pollution": {
        "ru": [
            "Микропластик стал одним из самых распространённых загрязнителей планеты. Частицы размером менее 5 мм обнаружены в глубоководных океанских впадинах, арктическом льду, питьевой воде и даже в лёгких человека. Долгосрочные последствия для здоровья людей и экосистем ещё изучаются.",
            "Химическое загрязнение почв представляет скрытую угрозу: тяжёлые металлы и стойкие органические загрязнители накапливаются в пищевых цепях, достигая наибольших концентраций у хищников верхнего уровня — в том числе у человека. Рекультивация загрязнённых территорий требует десятилетий и значительных затрат."
        ],
        "en": [
            "Microplastics have become one of the most widespread pollutants on the planet. Particles smaller than 5 mm have been found in deep ocean trenches, Arctic ice, drinking water and even human lungs. The long-term health and ecosystem consequences are still being studied.",
            "Chemical soil contamination poses a hidden threat: heavy metals and persistent organic pollutants accumulate in food chains, reaching the highest concentrations in top predators — including humans. Remediation of contaminated sites takes decades and significant resources."
        ]
    },
    "resources": {
        "ru": [
            "Вода — самый критичный природный ресурс XXI века. Несмотря на то что Земля покрыта водой на 71%, лишь около 0,3% всей пресной воды доступно для использования человеком в реках, озёрах и подземных водоносных горизонтах. Изменение климата усугубляет неравномерность распределения водных ресурсов.",
            "Принцип «нулевых отходов» (zero waste) набирает популярность как практический ответ на истощение ресурсов. Он предполагает переосмысление всего жизненного цикла продукта — от проектирования до утилизации — с целью максимального сохранения материалов в экономике и минимизации захоронения отходов."
        ],
        "en": [
            "Water is the most critical natural resource of the 21st century. Although Earth is 71% covered by water, only about 0.3% of all fresh water is accessible for human use in rivers, lakes and groundwater aquifers. Climate change is worsening the uneven distribution of water resources.",
            "The 'zero waste' principle is gaining popularity as a practical response to resource depletion. It involves rethinking the entire product lifecycle — from design to disposal — with the goal of keeping materials in the economy as long as possible and minimising landfill waste."
        ]
    },
    "protection": {
        "ru": [
            "Концепция «зелёной инфраструктуры» предполагает интеграцию природных элементов в городскую среду: парки, зелёные крыши, биокоридоры. Такой подход одновременно решает задачи охраны природы, адаптации к изменению климата и повышения качества жизни горожан.",
            "Экономическая оценка природных услуг помогает обосновать инвестиции в охрану природы. Исследования показывают, что каждый доллар, вложенный в охраняемые территории, приносит от 10 до 100 долларов в виде экосистемных услуг — регуляции климата, очистки воды, туризма и рекреации."
        ],
        "en": [
            "The concept of 'green infrastructure' involves integrating natural elements into the urban environment: parks, green roofs, bio-corridors. This approach simultaneously addresses nature conservation, climate change adaptation and improving urban quality of life.",
            "Economic valuation of natural services helps justify investment in nature conservation. Research shows that every dollar invested in protected areas yields between 10 and 100 dollars in ecosystem services — climate regulation, water purification, tourism and recreation."
        ]
    },
    "sustainable": {
        "ru": [
            "Концепция «планетарных границ», разработанная учёными Стокгольмского института устойчивости, определяет девять критических систем Земли, в пределах которых человечество может безопасно развиваться. По последним оценкам, шесть из девяти границ уже нарушены — включая изменение климата, утрату биоразнообразия и загрязнение химическими веществами.",
            "Устойчивое развитие требует системного мышления: решения, принятые в одной сфере, неизбежно влияют на другие. Например, переход на электромобили снижает выбросы CO₂, но увеличивает спрос на литий и кобальт, добыча которых сопряжена с экологическими и социальными рисками. Только комплексный подход позволяет избежать перекладывания проблем."
        ],
        "en": [
            "The 'planetary boundaries' concept, developed by scientists at the Stockholm Resilience Centre, defines nine critical Earth systems within which humanity can safely develop. According to the latest assessments, six of the nine boundaries have already been crossed — including climate change, biodiversity loss and chemical pollution.",
            "Sustainable development requires systems thinking: decisions made in one area inevitably affect others. For example, switching to electric vehicles reduces CO₂ emissions but increases demand for lithium and cobalt, whose extraction carries environmental and social risks. Only a comprehensive approach avoids shifting problems from one area to another."
        ]
    },
}

def parse_paragraphs(raw):
    """Парсит абзацы из JSON или строки с \\n."""
    if not raw:
        return []
    raw = raw.strip()
    if raw.startswith('['):
        return json.loads(raw)
    return [p.strip() for p in raw.split('\n') if p.strip()]

def update():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    for topic_id, extra in EXTRA.items():
        cur.execute("SELECT paragraphs_ru, paragraphs_en FROM ecology_topics WHERE id=?", (topic_id,))
        row = cur.fetchone()
        if not row:
            print(f"⚠ Тема {topic_id} не найдена")
            continue

        paras_ru = parse_paragraphs(row['paragraphs_ru']) + extra['ru']
        paras_en = parse_paragraphs(row['paragraphs_en']) + extra['en']

        cur.execute("""
            UPDATE ecology_topics SET paragraphs_ru=?, paragraphs_en=? WHERE id=?
        """, (
            json.dumps(paras_ru, ensure_ascii=False),
            json.dumps(paras_en, ensure_ascii=False),
            topic_id,
        ))
        print(f"✓ {topic_id}: теперь {len(paras_ru)} абзацев (RU)")

    conn.commit()
    conn.close()
    print("\n✅ Готово.")

if __name__ == "__main__":
    update()
