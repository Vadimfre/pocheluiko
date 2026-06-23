"""Восстановление оригинальных текстов тем экологии."""
import sqlite3, json, os

DB_PATH = os.path.join(os.path.dirname(__file__), 'ecology.db')

TOPICS = [
    {
        "id": "importance",
        "title_ru": "Важность экологии", "title_en": "Importance of ecology",
        "content_title_ru": "Почему экология важна для человечества",
        "content_title_en": "Why ecology is important for humanity",
        "paragraphs_ru": [
            "Экология — это наука о взаимодействии живых организмов между собой и с окружающей их средой. В современном мире экология приобрела особое значение, так как деятельность человека оказывает все большее влияние на природные процессы и экосистемы планеты.",
            "Экологические проблемы затрагивают каждого из нас. Загрязнение воздуха, воды и почвы, изменение климата, исчезновение видов животных и растений — всё это последствия нерационального использования природных ресурсов и пренебрежения законами природы.",
            "Понимание экологических процессов помогает принимать правильные решения для сохранения природы. Экология учит нас жить в гармонии с окружающим миром, не нарушая природный баланс, который складывался миллионы лет.",
            "Защита окружающей среды — это не просто модная тенденция, а жизненная необходимость для выживания человечества. Каждый из нас может внести свой вклад в сохранение природы для будущих поколений через осознанное потребление и бережное отношение к ресурсам.",
            "Экология изучает круговороты вещества и энергии в природе, структуру пищевых цепей и устойчивость экосистем. Эти знания необходимы для устойчивого сельского и лесного хозяйства, рыболовства, градостроительства и развития зелёных технологий.",
            "Современная экология тесно связана с другими науками: биологией, химией, физикой, географией, экономикой и социологией. Только комплексный подход позволяет решать сложные экологические проблемы и разрабатывать эффективные стратегии охраны природы.",
            "Экологическое образование и просвещение играют ключевую роль в формировании ответственного отношения к природе. Начиная с детского возраста, важно прививать любовь к природе и понимание того, что человек является частью экосистемы, а не её хозяином."
        ],
        "paragraphs_en": [
            "Ecology is the science of the interaction of living organisms with each other and with their environment. In the modern world, ecology has acquired special significance, as human activity is having an ever-greater impact on natural processes and the planet's ecosystems.",
            "Environmental problems affect each of us. Air, water and soil pollution, climate change, extinction of animal and plant species — all these are consequences of irrational use of natural resources and disregard for the laws of nature.",
            "Understanding ecological processes helps us make the right decisions to protect nature. Ecology teaches us to live in harmony with the world around us, without disturbing the natural balance that has developed over millions of years.",
            "Protecting the environment is not just a fashionable trend, but a vital necessity for the survival of humanity. Each of us can contribute to preserving nature for future generations through conscious consumption and careful use of resources.",
            "Ecology also studies the cycles of matter and energy in nature, the structure of food chains and the resilience of ecosystems. This knowledge is essential for sustainable agriculture and forestry, fisheries, urban planning and the development of green technologies.",
            "Modern ecology is closely linked to other sciences: biology, chemistry, physics, geography, economics and sociology. Only a comprehensive approach makes it possible to solve complex environmental problems and develop effective nature conservation strategies.",
            "Environmental education plays a key role in shaping a responsible attitude towards nature. From an early age, it is important to instil a love of nature and an understanding that humans are part of the ecosystem, not its master."
        ]
    },
    {
        "id": "climate",
        "title_ru": "Изменение климата", "title_en": "Climate change",
        "content_title_ru": "Глобальное изменение климата и его последствия",
        "content_title_en": "Global climate change and its consequences",
        "paragraphs_ru": [
            "Изменение климата — одна из самых серьезных экологических проблем современности. Повышение средней температуры Земли приводит к таянию ледников, повышению уровня моря и изменению погодных условий по всему миру.",
            "Основной причиной изменения климата является увеличение концентрации парниковых газов в атмосфере, вызванное деятельностью человека: сжиганием ископаемого топлива, вырубкой лесов и промышленным производством.",
            "Последствия изменения климата уже ощущаются во всем мире: участились экстремальные погодные явления — засухи, наводнения, ураганы; изменились сезоны, нарушились привычные экосистемы.",
            "Для решения проблемы необходимо сокращение выбросов парниковых газов, переход на возобновляемые источники энергии, повышение энергоэффективности и адаптация к новым климатическим условиям.",
            "Парижское соглашение 2015 года объединило страны мира в стремлении ограничить рост температуры до 1,5–2 °C. Национальные климатические стратегии и «зелёные» курсы задают ориентиры для бизнеса и общества."
        ],
        "paragraphs_en": [
            "Climate change is one of the most serious environmental problems of our time. Rising average temperatures on Earth lead to melting glaciers, rising sea levels and changing weather conditions around the world.",
            "The main cause of climate change is the increase in greenhouse gas concentrations in the atmosphere caused by human activities: burning fossil fuels, deforestation and industrial production.",
            "The consequences of climate change are already being felt worldwide: extreme weather events — droughts, floods, hurricanes — have become more frequent; seasons have shifted and familiar ecosystems have been disrupted.",
            "Addressing the problem requires reducing greenhouse gas emissions, switching to renewable energy sources, improving energy efficiency and adapting to new climatic conditions.",
            "The 2015 Paris Agreement united countries in the effort to limit temperature rise to 1.5–2 °C. National climate strategies and green policies set benchmarks for business and society."
        ]
    },
    {
        "id": "biodiversity",
        "title_ru": "Биоразнообразие", "title_en": "Biodiversity",
        "content_title_ru": "Сохранение биоразнообразия", "content_title_en": "Conservation of biodiversity",
        "paragraphs_ru": [
            "Биоразнообразие — это разнообразие жизни на Земле во всех её проявлениях: от генетического разнообразия внутри видов до разнообразия экосистем. Оно включает миллионы видов растений, животных, грибов и микроорганизмов.",
            "Биоразнообразие имеет огромное значение для функционирования экосистем. Каждый вид играет свою уникальную роль в поддержании экологического баланса, и исчезновение даже одного вида может вызвать цепную реакцию.",
            "Современные темпы исчезновения видов в 100–1000 раз превышают естественный фоновый уровень. Основные причины — разрушение и фрагментация мест обитания, загрязнение среды, инвазивные виды и изменение климата.",
            "Сохранение биоразнообразия требует создания и расширения сети охраняемых природных территорий, восстановления деградированных экосистем и устойчивого использования природных ресурсов.",
            "В Беларуси биоразнообразие сохраняется в заповедниках, национальных парках и заказниках. Здесь обитают редкие виды — зубр, рысь, чёрный аист, орлан-белохвост и многие другие."
        ],
        "paragraphs_en": [
            "Biodiversity is the diversity of life on Earth in all its forms: from genetic diversity within species to the diversity of ecosystems. It encompasses millions of species of plants, animals, fungi and microorganisms.",
            "Biodiversity is of enormous importance for ecosystem functioning. Each species plays a unique role in maintaining ecological balance, and the disappearance of even one species can trigger a chain reaction.",
            "Current extinction rates are 100–1000 times higher than the natural background level. The main causes are habitat destruction and fragmentation, pollution, invasive species and climate change.",
            "Conserving biodiversity requires creating and expanding networks of protected natural areas, restoring degraded ecosystems and sustainably using natural resources.",
            "In Belarus, biodiversity is preserved in reserves, national parks and wildlife sanctuaries. Rare species live here — the European bison, lynx, black stork, white-tailed eagle and many others."
        ]
    },
    {
        "id": "pollution",
        "title_ru": "Загрязнение окружающей среды", "title_en": "Environmental pollution",
        "content_title_ru": "Проблемы загрязнения и пути решения",
        "content_title_en": "Pollution problems and solutions",
        "paragraphs_ru": [
            "Загрязнение окружающей среды — это попадание в природную среду веществ или энергии, которые оказывают негативное воздействие на живые организмы и экосистемы. Различают загрязнение воздуха, воды, почвы, а также шумовое и световое загрязнение.",
            "Загрязнение воздуха происходит в результате выбросов промышленных предприятий, транспорта и сельского хозяйства. Мелкодисперсные частицы и токсичные газы наносят серьёзный вред здоровью людей и животных.",
            "Загрязнение воды представляет серьёзную угрозу для здоровья людей и водных экосистем. Промышленные стоки, удобрения и пластиковые отходы попадают в реки, озёра и океаны, нарушая их экологическое равновесие.",
            "Загрязнение почвы происходит из-за применения пестицидов, промышленных отходов и несанкционированных свалок. Это снижает плодородие почвы и угрожает продовольственной безопасности.",
            "Решение проблем загрязнения требует внедрения чистых технологий производства, развития системы переработки отходов, ответственного потребления и строгого экологического законодательства."
        ],
        "paragraphs_en": [
            "Environmental pollution is the introduction of substances or energy into the natural environment that have a negative impact on living organisms and ecosystems. It includes air, water and soil pollution, as well as noise and light pollution.",
            "Air pollution results from emissions by industrial enterprises, transport and agriculture. Fine particles and toxic gases cause serious harm to the health of people and animals.",
            "Water pollution poses a serious threat to human health and aquatic ecosystems. Industrial effluents, fertilisers and plastic waste enter rivers, lakes and oceans, disrupting their ecological balance.",
            "Soil pollution occurs due to the use of pesticides, industrial waste and illegal dumping. This reduces soil fertility and threatens food security.",
            "Solving pollution problems requires the introduction of clean production technologies, development of waste recycling systems, responsible consumption and strict environmental legislation."
        ]
    },
    {
        "id": "resources",
        "title_ru": "Природные ресурсы", "title_en": "Natural resources",
        "content_title_ru": "Рациональное использование природных ресурсов",
        "content_title_en": "Rational use of natural resources",
        "paragraphs_ru": [
            "Природные ресурсы делятся на возобновляемые (леса, вода, почва, солнечная энергия, ветер) и невозобновляемые (нефть, природный газ, уголь, металлические руды). Рациональное использование тех и других — основа устойчивого развития.",
            "Нерациональное использование природных ресурсов приводит к их истощению, деградации экосистем и обострению экологических проблем. Особую тревогу вызывает сокращение запасов пресной воды и плодородных почв.",
            "Рациональное природопользование предполагает эффективное использование ресурсов, их переработку и восстановление, а также поиск альтернативных источников энергии и материалов.",
            "Каждый из нас может внести вклад в сохранение природных ресурсов: экономить воду и электроэнергию, сортировать отходы, выбирать товары с минимальной упаковкой и поддерживать экологически ответственные компании.",
            "Леса — один из важнейших природных ресурсов. Они производят кислород, регулируют климат, очищают воду и служат средой обитания для тысяч видов. Устойчивое лесопользование и лесовосстановление — приоритеты экологической политики."
        ],
        "paragraphs_en": [
            "Natural resources are divided into renewable (forests, water, soil, solar energy, wind) and non-renewable (oil, natural gas, coal, metal ores). The rational use of both is the foundation of sustainable development.",
            "Irrational use of natural resources leads to their depletion, ecosystem degradation and worsening environmental problems. Particular concern is caused by the reduction of fresh water supplies and fertile soils.",
            "Rational nature management involves the efficient use of resources, their recycling and restoration, as well as the search for alternative energy sources and materials.",
            "Each of us can contribute to conserving natural resources: saving water and electricity, sorting waste, choosing products with minimal packaging and supporting environmentally responsible companies.",
            "Forests are one of the most important natural resources. They produce oxygen, regulate the climate, purify water and serve as habitat for thousands of species. Sustainable forestry and reforestation are priorities of environmental policy."
        ]
    },
    {
        "id": "protection",
        "title_ru": "Охрана природы", "title_en": "Nature protection",
        "content_title_ru": "Меры по охране природы", "content_title_en": "Measures for nature protection",
        "paragraphs_ru": [
            "Охрана природы — это комплекс научных, правовых, технических и воспитательных мер, направленных на сохранение и восстановление природных ресурсов, экосистем и биоразнообразия.",
            "Особо охраняемые природные территории (заповедники, национальные парки, заказники) играют ключевую роль в сохранении биоразнообразия. Они служат «банками» генетического разнообразия и эталонами нетронутой природы.",
            "Восстановление нарушенных экосистем — важное направление современной охраны природы. Реинтродукция исчезнувших видов, рекультивация земель и восстановление водно-болотных угодий дают ощутимые результаты.",
            "Экологическое просвещение и воспитание формируют экологическое сознание у людей всех возрастов. Без изменения отношения общества к природе технические меры охраны недостаточны.",
            "Международная кооперация в области охраны природы позволяет сохранять уникальные ландшафты и виды, выходящие за пределы национальных границ. Конвенции о биоразнообразии, СИТЕС и Рамсарская конвенция — примеры такого сотрудничества."
        ],
        "paragraphs_en": [
            "Nature protection is a set of scientific, legal, technical and educational measures aimed at preserving and restoring natural resources, ecosystems and biodiversity.",
            "Specially protected natural areas (reserves, national parks, wildlife sanctuaries) play a key role in conserving biodiversity. They serve as 'banks' of genetic diversity and benchmarks of pristine nature.",
            "Restoration of damaged ecosystems is an important area of modern nature conservation. Reintroduction of extinct species, land reclamation and restoration of wetlands yield tangible results.",
            "Environmental education and upbringing shape ecological awareness in people of all ages. Without changing society's attitude towards nature, technical conservation measures are insufficient.",
            "International cooperation in nature conservation makes it possible to preserve unique landscapes and species that extend beyond national borders. The Convention on Biological Diversity, CITES and the Ramsar Convention are examples of such cooperation."
        ]
    },
    {
        "id": "sustainable",
        "title_ru": "Устойчивое развитие", "title_en": "Sustainable development",
        "content_title_ru": "Концепция устойчивого развития",
        "content_title_en": "The concept of sustainable development",
        "paragraphs_ru": [
            "Устойчивое развитие — это модель развития общества, при которой удовлетворение потребностей нынешнего поколения не ставит под угрозу возможность будущих поколений удовлетворять свои потребности.",
            "Концепция устойчивого развития включает три взаимосвязанных компонента: экономическое развитие, социальная справедливость и охрана окружающей среды. Только их баланс обеспечивает долгосрочное благополучие.",
            "Устойчивое развитие предполагает переход к «зелёной» экономике: использование возобновляемых источников энергии, внедрение ресурсосберегающих технологий, развитие экологически чистого транспорта.",
            "Каждый из нас может способствовать устойчивому развитию через ответственное потребление: выбор товаров с экомаркировкой, отказ от одноразовых изделий, поддержка местных производителей.",
            "17 Целей устойчивого развития ООН, принятых в 2015 году, задают глобальную повестку до 2030 года. Они охватывают борьбу с бедностью, качественное образование, чистую энергию, климатические действия и многое другое."
        ],
        "paragraphs_en": [
            "Sustainable development is a model of societal development in which meeting the needs of the present generation does not jeopardise the ability of future generations to meet their own needs.",
            "The concept of sustainable development includes three interrelated components: economic development, social justice and environmental protection. Only their balance ensures long-term well-being.",
            "Sustainable development involves a transition to a 'green' economy: using renewable energy sources, introducing resource-saving technologies and developing clean transport.",
            "Each of us can contribute to sustainable development through responsible consumption: choosing products with eco-labels, refusing single-use items and supporting local producers.",
            "The 17 UN Sustainable Development Goals, adopted in 2015, set the global agenda to 2030. They cover poverty eradication, quality education, clean energy, climate action and much more."
        ]
    },
]

def update():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    for t in TOPICS:
        cur.execute("""
            UPDATE ecology_topics SET
                title_ru=?, title_en=?,
                content_title_ru=?, content_title_en=?,
                paragraphs_ru=?, paragraphs_en=?
            WHERE id=?
        """, (
            t["title_ru"], t["title_en"],
            t["content_title_ru"], t["content_title_en"],
            json.dumps(t["paragraphs_ru"], ensure_ascii=False),
            json.dumps(t["paragraphs_en"], ensure_ascii=False),
            t["id"],
        ))
        print(f"✓ {t['id']}")
    conn.commit()
    conn.close()
    print("✅ Готово.")

if __name__ == "__main__":
    update()
