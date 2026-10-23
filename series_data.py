"""Datos de la serie 'Datos para parecer inteligente'.

Cada parte: segmentos (gancho -> título -> resto) + un resumen para la descripción.
Cada dato trae contexto (el por qué/cómo) y 2 términos de imagen (imgs) para que
se muestren dos fotos por dato. El título hablado/en pantalla es igual en toda la serie.
"""

TITULO_PANTALLA = "Datos para parecer más inteligente."

# Palabras clave / tags para el buscador de YouTube (sin #).
KEYWORDS = [
    "shorts", "curiosidades", "datos curiosos", "sabias que", "cultura general",
    "datos interesantes", "datos para parecer inteligente", "cosas que no sabias",
    "aprender rapido", "curiosidades del mundo", "datos random", "viral",
]


def descripcion(parte: int, resumen: str) -> str:
    """Descripción SEO con gancho, framing de serie y keywords."""
    return (
        "¿Querés parecer más inteligente? 🧠 Bienvenido a la serie donde te tiro datos "
        "curiosos que casi nadie conoce para que dejes a todos con la boca abierta.\n\n"
        f"📌 Parte {parte}: {resumen}.\n\n"
        f"💡 Seguime para no perderte la Parte {parte + 1} con más curiosidades y "
        "cultura general en 60 segundos.\n\n"
        "datos curiosos, curiosidades, cosas que no sabías, cultura general, sabías que, "
        "datos interesantes, datos para parecer inteligente, aprender rápido.\n\n"
        "#shorts #curiosidades #datoscuriosos #sabiasque #culturageneral #datos"
    )


# Fondos que ROTAN por episodio (todos ~85s para que no se congelen en IG).
BACKGROUNDS = [
    "backgrounds/bg_minecraft.mp4",    # parkour de Minecraft
    "backgrounds/bg_subway.mp4",       # Subway Surfers
    "backgrounds/bg_gta.mp4",          # mega rampas de GTA V
    "backgrounds/bg_slime.mp4",        # slime
    "backgrounds/bg_satisfying.mp4",   # videos satisfactorios
    # variantes 2 (minecraft)
    "backgrounds/bg_minecraft_2.mp4",
    # variantes 2 (subway)
    "backgrounds/bg_subway_2.mp4",
    # variantes 2 (gta)
    "backgrounds/bg_gta_2.mp4",
    # variantes 2 (slime)
    "backgrounds/bg_slime_2.mp4",
    # variantes 2 (satisfying)
    "backgrounds/bg_satisfying_2.mp4",
    # variantes 3 (minecraft)
    "backgrounds/bg_minecraft_3.mp4",
    # variantes 3 (subway)
    "backgrounds/bg_subway_3.mp4",
    # variantes 3 (gta)
    "backgrounds/bg_gta_3.mp4",
    # variantes 3 (slime)
    "backgrounds/bg_slime_3.mp4",
    # variantes 3 (satisfying)
    "backgrounds/bg_satisfying_3.mp4",
    # variantes 4 (cortadas del tramo final de los *_raw2, metraje sin usar;
    # slime/satisfying no tienen v4: falta materia prima nueva)
    "backgrounds/bg_minecraft_4.mp4",
    "backgrounds/bg_subway_4.mp4",
    "backgrounds/bg_gta_4.mp4",
]


def background_for(part: int) -> str:
    """Fondo rotativo según el número de parte."""
    return BACKGROUNDS[(part - 1) % len(BACKGROUNDS)]


# Patrones de "bienvenida": saludo / anuncio de tema hablado ANTES del dato.
# El análisis de viralidad (docs/formula-faceless-viral.md §1, §9.1-3) mostró
# que los videos que abrían con esto fueron los PEORES del canal: el short tiene
# que arrancar EN el hook (el dato/afirmación contraintuitiva) en el frame 0.
_BIENVENIDA_PREFIJOS = (
    "hola", "buenas", "buenos dias", "buenas tardes", "buenas noches",
    "que tal", "bienvenido", "bienvenida", "bienvenidos", "bienvenidas",
    "hoy te traigo", "hoy les traigo", "hoy vamos", "en el video de hoy",
    "en este video", "en el dia de hoy", "suscribite", "suscribete",
    "antes de empezar", "arrancamos", "como estan", "como andan",
)


def _norm_bienvenida(text: str) -> str:
    """Minúsculas sin acentos ni signos de apertura, para comparar prefijos."""
    t = (text or "").strip().lower().lstrip("¿¡\"'(-–— ")
    for a, b in (("á", "a"), ("é", "e"), ("í", "i"), ("ó", "o"), ("ú", "u"), ("ü", "u")):
        t = t.replace(a, b)
    return t


def es_bienvenida(text: str) -> bool:
    """¿La frase es un saludo/bienvenida/anuncio de tema (patrón de video muerto)
    en vez de arrancar en el dato? Mira el ARRANQUE de la frase (no el medio: un
    dato puede mencionar 'hoy' o 'video' más adelante sin ser una bienvenida)."""
    t = _norm_bienvenida(text)
    return any(t.startswith(p) for p in _BIENVENIDA_PREFIJOS)


def assert_hook_first(segments: list) -> None:
    """Garantiza que el guion ARRANCA en el hook: el primer segmento es un dato
    hablado ('fact') y no una tarjeta de título ni una bienvenida. Levanta
    ValueError si no (el pipeline aborta antes de renderizar un video muerto)."""
    if not segments:
        raise ValueError("guion sin segmentos")
    first = segments[0]
    if first.get("kind") != "fact":
        raise ValueError(
            f"el guion no abre en el hook: el primer segmento es "
            f"{first.get('kind')!r}, debería ser un 'fact' (el dato)")
    if es_bienvenida(first.get("text", "")):
        raise ValueError(
            f"el guion abre con una bienvenida/saludo en vez del dato: "
            f"{first.get('text', '')[:60]!r}")


def _T():
    return {"kind": "title", "text": TITULO_PANTALLA}


def _f(text, *imgs):
    return {"kind": "fact", "text": text, "imgs": list(imgs)}


PARTS = {
    1: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("por qué el pulpo tiene sangre azul, por qué en Venus un día dura más que un "
                    "año, por qué la miel nunca caduca, por qué un rayo es más caliente que el Sol "
                    "y por qué Saturno flotaría en el agua"),
        "segments": [
            _f("El pulpo tiene tres corazones y su sangre es azul. Dos bombean a las branquias y el tercero al resto del cuerpo, y es azul porque usa cobre en vez de hierro.", "octopus", "octopus underwater"),
            _T(),
            _f("En Venus, un día dura más que un año. Gira tan lento que tarda doscientos cuarenta y tres días en girar sobre sí mismo, pero solo doscientos veinticinco en rodear al Sol.", "venus planet", "venus surface"),
            _f("La miel nunca se echa a perder. Encontraron miel de tres mil años en tumbas egipcias, todavía comestible. Casi no tiene agua y es muy ácida, así que ninguna bacteria sobrevive adentro.", "honey", "honeycomb"),
            _f("Un rayo es cinco veces más caliente que la superficie del Sol: llega a treinta mil grados. Calienta el aire tan rápido que explota, y ese estallido es el trueno.", "lightning", "lightning storm"),
            _f("Saturno es tan liviano que flotaría en el agua. Está hecho casi solo de gas, así que es menos denso que el agua.", "saturn planet", "saturn rings"),
        ],
    },
    2: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("cuántas estrellas hay en el universo, las huellas de los koalas, por qué la "
                    "Torre Eiffel crece en verano, las abejas que reconocen caras y por qué el "
                    "plátano es radiactivo"),
        "segments": [
            _f("Hay más estrellas en el universo que granos de arena en toda la Tierra. Son tantas que, si contaras una por segundo, tardarías más que la edad del universo en terminar.", "galaxy", "stars night sky"),
            _T(),
            _f("Los koalas tienen huellas dactilares casi idénticas a las nuestras. Son tan parecidas que, bajo un microscopio, hasta un experto podría confundirlas con huellas humanas.", "koala", "koala tree"),
            _f("La Torre Eiffel crece en verano. El calor dilata el metal y la torre puede medir hasta quince centímetros más alta que en invierno, cuando el frío la encoge de nuevo.", "eiffel tower", "paris"),
            _f("Las abejas pueden reconocer caras humanas. Combinan los rasgos como si armaran un rompecabezas, la misma técnica que usamos nosotros, aunque su cerebro es más chico que una semilla.", "bee", "honeybee flower"),
            _f("El plátano es levemente radiactivo por su potasio. Es tan poco que necesitarías comer millones de golpe para que sea un problema.", "banana", "bananas"),
        ],
    },
    3: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("los tardígrados que sobreviven en el espacio, Cleopatra más cerca de la Luna "
                    "que de las pirámides, por qué los flamencos son rosados, el planeta donde "
                    "llueve vidrio y cuánto ADN compartimos con un plátano"),
        "segments": [
            _f("Los tardígrados pueden sobrevivir en el espacio exterior. Estos bichos microscópicos aguantan el vacío, la radiación y el frío extremo. Los mandaron al espacio sin traje y volvieron vivos.", "tardigrade", "microscope"),
            _T(),
            _f("Cleopatra vivió más cerca de la llegada a la Luna que de la construcción de las pirámides. Para ella, las pirámides ya eran ruinas antiquísimas. La historia es larguísima.", "pyramids egypt", "egypt"),
            _f("Los flamencos nacen grises, no rosados. Se vuelven rosados por lo que comen: camarones y algas con pigmentos que tiñen sus plumas. Si dejaran de comerlos, volverían a ser pálidos.", "flamingo", "flamingos"),
            _f("Existe un planeta donde llueve vidrio de costado. Sus vientos superan los siete mil kilómetros por hora y lanzan partículas de vidrio fundido en horizontal.", "exoplanet", "planet space"),
            _f("Compartís más de la mitad de tu ADN con un plátano. Aunque no se parezcan en nada, gran parte de las instrucciones básicas de la vida son iguales en casi todos los seres.", "dna", "banana"),
        ],
    },
    4: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("los átomos de una cucharada de agua, los delfines que se ponen nombres, la "
                    "montaña más alta de verdad, las nutrias que duermen de la mano y cuál es el "
                    "planeta más caliente"),
        "segments": [
            _f("Hay más átomos en una cucharada de agua que estrellas en todo el universo observable. Los átomos son tan minúsculos que su número es imposible de imaginar.", "water drop", "galaxy"),
            _T(),
            _f("Los delfines se ponen nombres. Cada uno inventa un silbido único para sí mismo, y los demás lo usan para llamarlo, igual que un nombre propio entre nosotros.", "dolphin", "dolphins ocean"),
            _f("El Everest no es la montaña más alta si medís desde la base. El volcán Mauna Kea, en Hawái, es más alto, pero casi todo su cuerpo está bajo el agua.", "mount everest", "mountain"),
            _f("Las nutrias duermen tomadas de la mano. Lo hacen para no separarse con la corriente mientras flotan, y a veces se envuelven en algas como si fueran un cinturón.", "otter", "sea otter"),
            _f("El planeta más caliente no es Mercurio, es Venus. Su atmósfera atrapa tanto calor que supera los cuatrocientos grados, suficiente para derretir plomo.", "venus planet", "planet"),
        ],
    },
    5: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("por qué el estómago no se digiere a sí mismo, los pulpos que saborean con los "
                    "brazos, el material más duro del cuerpo, las lunas de Saturno y los pingüinos "
                    "que regalan piedras"),
        "segments": [
            _f("Tu estómago fabrica una capa nueva cada pocos días para no digerirse a sí mismo. Sus ácidos podrían disolver metal, pero una capa de moco lo protege por dentro.", "stomach anatomy", "human body"),
            _T(),
            _f("Los pulpos saborean con los brazos. Cada ventosa tiene receptores de gusto, así que literalmente prueban todo lo que tocan sin llevárselo a la boca.", "octopus", "octopus tentacles"),
            _f("El esmalte de tus dientes es el material más duro de tu cuerpo, más que el hueso. Pero, a diferencia de los huesos, no se regenera: lo que se rompe no vuelve.", "teeth", "dentist"),
            _f("Saturno tiene más de cien lunas confirmadas. Le ganó a Júpiter como el planeta con más lunas, y todavía siguen descubriendo nuevas cada año.", "saturn planet", "saturn rings"),
            _f("Los pingüinos le regalan piedras a su pareja. El macho busca la piedra más lisa y perfecta y se la ofrece; si la acepta, forman pareja.", "penguin", "penguins"),
        ],
    },
    6: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("cuántos rayos caen por día, las vacas que tienen mejores amigas, el peso del "
                    "Sol, los caracoles que duermen años y por qué hay más árboles que estrellas en "
                    "la galaxia"),
        "segments": [
            _f("En la Tierra caen unos ocho millones de rayos por día. Eso es casi cien rayos por segundo golpeando el planeta en algún lado, todo el tiempo, sin parar.", "lightning", "storm"),
            _T(),
            _f("Las vacas tienen mejores amigas. Forman vínculos fuertes con otras vacas y su corazón se estresa si las separan, igual que a nosotros cuando extrañamos a alguien.", "cow", "cows field"),
            _f("El Sol es el noventa y nueve por ciento de toda la masa del sistema solar. Todo lo demás, los ocho planetas juntos, es apenas el uno por ciento que sobró.", "sun", "solar system"),
            _f("Algunos caracoles pueden dormir hasta tres años seguidos. Cuando el clima es muy seco, se encierran en su caparazón y bajan tanto su cuerpo que parecen muertos.", "snail", "snail shell"),
            _f("Hay más árboles en la Tierra que estrellas en la Vía Láctea. Se calculan unos tres billones de árboles, muchísimos más que las estrellas de nuestra galaxia.", "forest", "trees"),
        ],
    },
    7: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("el volcán gigante de Marte, por qué los elefantes no saltan, el billón de "
                    "olores que recordás, el mito de la Muralla China y cuánto dura un año en "
                    "Neptuno"),
        "segments": [
            _f("Marte tiene el volcán más grande del sistema solar. El Monte Olimpo es tres veces más alto que el Everest y tan ancho como un país entero.", "mars planet", "volcano"),
            _T(),
            _f("Los elefantes son los únicos animales que no pueden saltar. Su enorme peso y la forma de sus patas hacen que nunca despeguen las cuatro del suelo a la vez.", "elephant", "elephants"),
            _f("Tu nariz puede recordar más de un billón de olores. Cada aroma queda grabado con una emoción, por eso un olor puede transportarte de golpe a un recuerdo de la infancia.", "nose", "perfume"),
            _f("La Gran Muralla China no se ve desde el espacio a simple vista. Es larguísima, pero demasiado angosta para distinguirla sin ayuda desde la órbita. Es un mito famoso.", "great wall china", "china"),
            _f("Un año en Neptuno dura ciento sesenta y cinco años terrestres. Está tan lejos del Sol que, desde que lo descubrimos, recién completó una vuelta hace poco.", "neptune planet", "planet space"),
        ],
    },
    8: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("la medusa inmortal, el tamaño de Júpiter, por qué las jirafas casi no duermen, "
                    "el animal más letal del mundo y cuánta saliva generás en la vida"),
        "segments": [
            _f("Existe una medusa biológicamente inmortal. Cuando envejece o se lastima, puede volver a su etapa de bebé y empezar de nuevo, repitiendo el ciclo, en teoría, para siempre.", "jellyfish", "jellyfish ocean"),
            _T(),
            _f("En Júpiter cabrían más de mil planetas Tierra adentro. Es tan gigante que su Gran Mancha Roja, una sola tormenta, es más grande que todo nuestro planeta.", "jupiter planet", "jupiter"),
            _f("Las jirafas duermen menos de dos horas por día, muchas veces paradas y en siestas de pocos minutos, porque echarse las deja indefensas ante los depredadores.", "giraffe", "giraffes"),
            _f("El animal más letal del mundo es el mosquito. Mata a más humanos por año que cualquier otro, por las enfermedades que transmite, más que tiburones y serpientes juntos.", "mosquito", "mosquito macro"),
            _f("A lo largo de tu vida vas a producir saliva suficiente para llenar dos piscinas. Trabaja todo el día sin que lo notes, ayudándote a tragar y a sentir los sabores.", "swimming pool", "water"),
        ],
    },
    9: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("la Luna que se aleja, los gatos que duermen casi toda su vida, el Sahara que "
                    "fue verde, la lluvia de diamantes en los gigantes gaseosos y el corazón del "
                    "colibrí"),
        "segments": [
            _f("La Luna se aleja de la Tierra unos cuatro centímetros por año. Dentro de millones de años los días serán más largos y ya no habrá eclipses totales de Sol como hoy.", "moon", "full moon"),
            _T(),
            _f("Los gatos pasan cerca del setenta por ciento de su vida durmiendo. Un gato de nueve años estuvo despierto solo unos tres. Duermen tanto para ahorrar energía de cazador.", "cat sleeping", "cat"),
            _f("El desierto del Sahara fue verde hace pocos miles de años. Estaba lleno de lagos, ríos y animales, y hay pinturas rupestres que lo prueban. El clima lo convirtió en arena.", "sahara desert", "desert"),
            _f("En Júpiter y Saturno probablemente llueven diamantes. Sus tormentas convierten el carbono en diamante, que cae como granizo brillante a través de la atmósfera.", "saturn planet", "diamond"),
            _f("El corazón de un colibrí late más de mil veces por minuto. Vive tan acelerado que debe comer casi cada diez minutos o no sobrevive.", "hummingbird", "hummingbird flower"),
        ],
    },
    10: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("los dos billones de galaxias, lo poco que conocemos del océano, los koalas "
                    "dormilones, las alas de las abejas y lo lejos que está la estrella más cercana"),
        "segments": [
            _f("El universo tiene más de dos billones de galaxias, y cada una tiene miles de millones de estrellas. Los números son tan grandes que el cerebro no los puede imaginar.", "galaxy", "galaxies space"),
            _T(),
            _f("Conocemos mejor la Luna que el fondo de nuestros océanos. Más del ochenta por ciento del mar sigue inexplorado; hay mejores mapas de Marte que del fondo marino.", "deep ocean", "underwater"),
            _f("Los koalas duermen hasta veintidós horas por día. Sus hojas de eucalipto son casi tóxicas y dan poquísima energía, así que dormir es su forma de sobrevivir.", "koala", "koala sleeping"),
            _f("Las abejas baten sus alas más de doscientas veces por segundo. Por eso zumban, y por eso pueden volar cargando néctar que pesa casi como ellas.", "bee", "bee flying"),
            _f("La luz del Sol tarda ocho minutos en llegar, pero la de la estrella más cercana tarda cuatro años. Si el Sol se apagara, lo sabríamos ocho minutos después.", "stars night sky", "sun space"),
        ],
    },
    11: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("las combinaciones de un mazo de cartas, los tiburones más viejos que los "
                    "árboles, por qué los caballos no pueden vomitar, el desierto más grande del "
                    "mundo y el papel que llega a la Luna"),
        "segments": [
            _f("Si barajás bien un mazo de 52 cartas, es casi seguro que ese orden exacto nunca existió antes en toda la historia. Hay más combinaciones posibles que átomos en toda la Tierra.", "playing cards", "deck of cards"),
            _T(),
            _f("Los tiburones son más viejos que los árboles. Ya nadaban en los océanos más de cien millones de años antes de que creciera el primer árbol sobre la tierra.", "shark", "shark underwater"),
            _f("Los caballos no pueden vomitar. Su sistema digestivo va en un solo sentido, así que un simple dolor de panza puede volverse mortal para ellos.", "horse", "horses field"),
            _f("El desierto más grande del mundo es la Antártida. Un desierto se define por lo poco que llueve, no por el calor, y ahí casi nunca cae agua.", "antarctica", "ice landscape"),
            _f("Si pudieras doblar una hoja de papel 42 veces, su grosor llegaría hasta la Luna. Cada doblez duplica el espesor y el número se dispara rapidísimo.", "folded paper", "moon"),
        ],
    },
    12: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("las conexiones de tu cerebro, el peso de las nubes, los huesos del cuello de "
                    "la jirafa, la fosa más profunda que el Everest y el ADN que llega a Plutón"),
        "segments": [
            _f("Tenés más conexiones en el cerebro que estrellas hay en la Vía Láctea. Son unos 86 mil millones de neuronas, cada una enganchada a miles de otras.", "brain", "neurons synapse"),
            _T(),
            _f("Una sola nube de tormenta puede pesar como cien elefantes. Flota igual porque está repartida en gotitas diminutas sobre un aire todavía más pesado.", "storm cloud", "clouds sky"),
            _f("La jirafa tiene exactamente los mismos huesos en el cuello que vos: siete. Son mucho más grandes, pero la cantidad es idéntica a la de un humano.", "giraffe", "giraffe neck"),
            _f("La fosa más profunda del océano es más honda que alto es el Everest. Si hundieras la montaña entera ahí adentro, todavía le quedarían dos kilómetros de agua encima.", "deep ocean", "mariana trench"),
            _f("Todo el ADN de tu cuerpo, estirado en una línea, llegaría hasta Plutón y volvería varias veces. Está enrollado tan apretado que entra en células invisibles.", "dna helix", "pluto planet"),
        ],
    },
    13: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("el día que duraba 18 horas, los gatos que no sienten lo dulce, el oro "
                    "escondido en la Tierra, el corazón del camarón y el día de Mercurio"),
        "segments": [
            _f("Hace mil millones de años, un día en la Tierra duraba solo 18 horas. El planeta giraba más rápido y fue frenando de a poco por el tirón de la Luna.", "earth space", "planet earth"),
            _T(),
            _f("Los gatos no pueden sentir el sabor dulce. Les falta el gen para detectarlo, así que si les gusta un postre es por la grasa, no por el azúcar.", "cat", "kitten"),
            _f("Hay tanto oro escondido en el interior de la Tierra que alcanzaría para cubrir todo el planeta con una capa de medio metro. El problema es que está a miles de kilómetros de profundidad.", "gold", "gold nugget"),
            _f("El corazón del camarón está en su cabeza. Varios de sus órganos vitales viven ahí arriba, en una zona que mezcla la cabeza con el tórax.", "shrimp", "prawn"),
            _f("En Mercurio, un día dura más que un año. Tarda 176 días terrestres en amanecer dos veces, pero solo 88 en dar la vuelta entera al Sol.", "mercury planet", "mercury surface"),
        ],
    },
    14: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("la paradoja del cumpleaños, la nariz única de los perros, el cerebro que no "
                    "siente dolor, el oxígeno que sale del mar y la caca cuadrada del wombat"),
        "segments": [
            _f("En un grupo de apenas 23 personas ya hay más del 50% de chance de que dos cumplan años el mismo día. Parece imposible, pero las combinaciones entre todos se disparan.", "birthday cake", "crowd people"),
            _T(),
            _f("La nariz de cada perro es única, como nuestras huellas digitales. En algunos lugares registran a los perros justamente por la huella de su nariz.", "dog nose", "dog face"),
            _f("Tu cerebro no siente dolor. No tiene receptores para eso, por eso se puede operar a alguien despierto mientras le tocan el cerebro.", "brain scan", "brain model"),
            _f("Más de la mitad del oxígeno que respirás no viene de los bosques, viene del mar. Lo producen algas microscópicas que flotan en el océano.", "ocean", "sea water"),
            _f("El wombat hace caca con forma de cubo. Es el único animal que lo logra, y le sirve para marcar territorio sin que se le ruede cuesta abajo.", "wombat", "wombat animal"),
        ],
    },
    15: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("el Sol del tamaño de una pelota, el bosque que es un solo árbol, la cucharada "
                    "de estrella de neutrones, el corazón de la ballena azul y por qué brillás en "
                    "la oscuridad"),
        "segments": [
            _f("Si el Sol fuera una pelota de fútbol, la Tierra sería un grano de arena a 25 metros de distancia. El espacio está casi todo vacío.", "soccer ball", "solar system"),
            _T(),
            _f("Hay un bosque en Estados Unidos que en realidad es un solo árbol. Se llama Pando: miles de troncos salen de una misma raíz de más de 80 mil años.", "aspen forest", "forest trees"),
            _f("Una sola cucharadita de estrella de neutrones pesaría más de mil millones de toneladas. La materia ahí está tan aplastada que nada en la Tierra se le acerca.", "neutron star", "star space"),
            _f("El corazón de una ballena azul es tan grande como un auto chico. Late tan fuerte que se podría escuchar a varios kilómetros bajo el agua.", "blue whale", "whale ocean"),
            _f("Tu cuerpo brilla en la oscuridad, literalmente. Emitís una lucecita mil veces más débil de lo que el ojo humano puede llegar a ver.", "glowing light", "dark silhouette"),
        ],
    },
    16: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("las zanahorias que eran moradas, los atardeceres azules de Marte, por qué los "
                    "cocodrilos no sacan la lengua, el ser vivo más grande del mundo y las mariposas "
                    "que saborean con las patas"),
        "segments": [
            _f("Las zanahorias eran moradas, no naranjas. Se volvieron naranjas hace unos cuatrocientos años, cuando agricultores holandeses las cultivaron de ese color en honor a su familia real.", "purple carrots", "carrots bunch"),
            _T(),
            _f("Marte tiene atardeceres azules. El polvo finísimo de su atmósfera filtra la luz al revés que acá: de día el cielo se ve rojizo y al atardecer se pone azul alrededor del Sol.", "mars sunset", "mars surface"),
            _f("Los cocodrilos no pueden sacar la lengua. La tienen pegada al piso de la boca por una membrana, así que por más que quieran, no te la pueden mostrar.", "crocodile mouth", "crocodile"),
            _f("El ser vivo más grande del mundo es un hongo. En un bosque de Oregón hay uno que se extiende bajo tierra por más de nueve kilómetros cuadrados y tiene miles de años.", "forest mushroom", "oregon forest"),
            _f("Las mariposas saborean con las patas. Apenas se posan sobre una flor o una fruta, sus patas detectan si eso sirve para comer o para poner huevos.", "butterfly flower", "butterfly macro"),
        ],
    },
    17: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("los tres mil millones de latidos de tu corazón, el ojo del avestruz más grande "
                    "que su cerebro, el metal que se derrite en la mano, los miles de dientes del "
                    "caracol y el día lunar que dura casi un mes"),
        "segments": [
            _f("Tu corazón va a latir unos tres mil millones de veces a lo largo de tu vida, sin parar jamás, ni siquiera cuando dormís. Es la máquina más confiable que existe.", "human heart anatomy", "heartbeat pulse"),
            _T(),
            _f("El avestruz tiene los ojos más grandes que su propio cerebro. Cada ojo es como una pelota de billar, más grande que la masa de sesos que le entra en la cabeza.", "ostrich eye", "ostrich head"),
            _f("El metal galio se derrite en tu mano. Parece aluminio sólido, pero su punto de fusión es tan bajo que el calor de la palma alcanza para volverlo líquido.", "gallium metal", "liquid metal hand"),
            _f("El caracol tiene miles de dientes. En vez de muelas usa una lengua cubierta de hasta veinte mil dientes diminutos para raspar la comida.", "snail close up", "snail macro"),
            _f("Un día en la Luna dura casi un mes terrestre. El Sol tarda unos veintinueve días en salir y volver a salir, así que una sola tarde lunar dura más de una semana nuestra.", "moon surface", "full moon"),
        ],
    },
    18: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("el mito de Napoleón bajo, los vikingos sin cascos con cuernos, a qué huele la "
                    "Vía Láctea, el lago rosa de Australia y los perezosos que aguantan la respiración"),
        "segments": [
            _f("Napoleón no era bajo. Medía lo normal para su época, cerca de un metro setenta; la fama de enano fue propaganda de sus enemigos y un enredo con las medidas francesas.", "napoleon portrait", "napoleon painting"),
            _T(),
            _f("Los vikingos nunca usaron cascos con cuernos. Esa imagen la inventó una ópera alemana en el siglo diecinueve; en batalla, los cuernos solo habrían estorbado.", "viking helmet", "viking warrior"),
            _f("La Vía Láctea huele a frambuesas y sabría a ron. En una nube de gas del centro de la galaxia detectaron el mismo compuesto químico que da ese olor y ese sabor.", "milky way galaxy", "raspberries"),
            _f("Hay un lago de color rosa chicle en Australia. El lago Hillier mantiene ese tono intenso todo el año, por unas algas y bacterias especiales que viven en su agua salada.", "pink lake australia", "lake aerial"),
            _f("Los perezosos aguantan la respiración más que los delfines. Bajan tanto su ritmo cardíaco que resisten hasta cuarenta minutos sin tomar aire.", "sloth tree", "sloth hanging"),
        ],
    },
    19: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("la estrella que se tragaría varios planetas, el árbol más alto del mundo, el "
                    "camarón más ruidoso que un disparo, las huellas eternas en la Luna y el arrecife "
                    "que se ve desde el espacio"),
        "segments": [
            _f("Hay una estrella tan gigante que, si la pusieras en lugar del Sol, se tragaría a la Tierra, a Marte y hasta a Júpiter. Al lado, nuestro Sol sería apenas un puntito.", "giant star space", "red supergiant star"),
            _T(),
            _f("El árbol más alto del mundo mide como un edificio de treinta pisos. Es una secuoya de California llamada Hyperion, de más de ciento quince metros, y su ubicación exacta es secreta.", "giant sequoia", "redwood forest"),
            _f("El animal más ruidoso del mar es un camarón. El camarón pistola cierra su pinza tan rápido que genera una burbuja que estalla con un sonido más fuerte que un disparo.", "pistol shrimp", "shrimp claw"),
            _f("Las huellas de los astronautas en la Luna van a durar millones de años. Como no hay viento ni agua que las borren, siguen ahí intactas desde hace más de cincuenta años.", "astronaut footprint moon", "moon landing"),
            _f("La Gran Barrera de Coral es la estructura viva más grande del planeta y se ve desde el espacio. La construyeron miles de millones de animalitos diminutos: los corales.", "great barrier reef", "coral reef aerial"),
        ],
    },
    20: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("el agua que hierve y se congela a la vez, los millones de células que fabricás "
                    "por segundo, el planeta de diamante, el hipo que duró 68 años y cuánta energía "
                    "gasta tu cerebro"),
        "segments": [
            _f("El agua puede hervir y congelarse al mismo tiempo. En un punto exacto de presión y temperatura, llamado punto triple, es hielo, líquido y vapor a la vez.", "boiling water", "ice water"),
            _T(),
            _f("Tu cuerpo fabrica millones de células nuevas cada segundo. Mientras leés esto estás reemplazando pedacitos de vos mismo, todo el tiempo, sin notarlo.", "cells microscope", "cell division"),
            _f("Hay un planeta que podría estar cubierto de diamante. Es tan rico en carbono y está bajo tanta presión que buena parte de su interior sería diamante puro.", "diamond planet space", "exoplanet"),
            _f("El hipo más largo de la historia duró sesenta y ocho años. Un hombre en Estados Unidos empezó a hipar en mil novecientos veintidós y no paró hasta poco antes de morir.", "vintage man portrait", "hiccup illustration"),
            _f("Tu cerebro gasta la quinta parte de toda tu energía, aunque pesa poco más de un kilo. Pensar, incluso sentado y quieto, consume muchísimo.", "human brain", "brain energy"),
        ],
    },
    21: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("por qué los huesos son más fuertes que el acero, el agua que puede estar "
                    "fría y no congelarse, los ojos de la mantis que ven colores imposibles, el "
                    "trueno que calienta Júpiter y la lengua del camaleón"),
        "segments": [
            _f("Tus huesos son más fuertes que el acero por su peso. Un trozo del tamaño de una caja de fósforos aguanta varias toneladas sin romperse, y encima pesa muchísimo menos que el metal.", "human bones", "skeleton anatomy"),
            _T(),
            _f("El agua puede estar bajo cero y seguir líquida. Si está muy limpia y quieta, se queda líquida hasta los cuarenta grados bajo cero, y basta un pequeño golpe para que se congele de golpe en segundos.", "ice crystals", "frozen water"),
            _f("El camarón mantis ve colores que ni imaginamos. Nosotros tenemos tres tipos de detectores de color; él tiene dieciséis, así que percibe tonos que para nuestros ojos ni siquiera existen.", "mantis shrimp", "colorful shrimp"),
            _f("En Júpiter hay tormentas con rayos cientos de veces más potentes que los de la Tierra. Se ven como enormes destellos azules en su atmósfera, muchísimo más violentos que cualquier tormenta nuestra.", "jupiter storm", "jupiter planet"),
            _f("La lengua del camaleón sale más rápido que un auto deportivo. Dispara su lengua pegajosa en centésimas de segundo, acelerando más fuerte que cualquier motor, para atrapar insectos a distancia.", "chameleon", "chameleon tongue"),
        ],
    },
    22: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("el relámpago que creó el vidrio del desierto, los ojos del caracol en los "
                    "cuernos, el planeta que gira de costado, los dientes del tiburón que nunca se "
                    "acaban y la sangre que recorre kilómetros"),
        "segments": [
            _f("Cuando un rayo cae en la arena del desierto, crea tubos de vidrio bajo tierra. El calor es tan brutal que funde la arena al instante y la convierte en figuras de vidrio huecas y retorcidas.", "desert sand", "fulgurite glass"),
            _T(),
            _f("Los caracoles tienen los ojos en la punta de sus cuernos. Los estiran para mirar alrededor y los meten para adentro si algo los asusta, como si guardaran los ojos en un estuche.", "snail eyes", "garden snail"),
            _f("Urano gira acostado de costado. En vez de rodar como los otros planetas, da vueltas tumbado, así que en cada polo hay cuarenta años de día seguidos y después cuarenta de noche.", "uranus planet", "uranus space"),
            _f("A los tiburones les crecen dientes toda la vida. Pierden miles a lo largo de los años, pero siempre tienen filas nuevas listas atrás que avanzan para reemplazar a las de adelante.", "shark teeth", "shark jaw"),
            _f("Si estiraras todos los vasos sanguíneos de tu cuerpo en una sola línea, darían dos vueltas y media a la Tierra. Son unos cien mil kilómetros de venas, arterias y capilares diminutos.", "blood vessels", "circulatory system"),
        ],
    },
    23: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("el relámpago más largo medido, las vacas magnéticas que apuntan al norte, el "
                    "metal más liviano que el agua, el animal que no envejece y la estrella que late"),
        "segments": [
            _f("El relámpago más largo jamás medido cruzó casi setecientos kilómetros de cielo de una sola vez. Nació en Texas y atravesó varios estados, como una grieta de luz tan larga como un país.", "lightning sky", "thunderstorm"),
            _T(),
            _f("Las vacas tienden a pararse mirando al norte o al sur. Sin darse cuenta, alinean su cuerpo con el campo magnético de la Tierra, como si llevaran una brújula interna.", "cows field", "herd of cows"),
            _f("Existe un metal tan liviano que flota en el agua. El litio es tan poco denso que un trozo se queda arriba del agua, aunque es un metal de verdad que reacciona apenas lo toca.", "lithium metal", "metal sample"),
            _f("La langosta casi no envejece. Sigue creciendo y reproduciéndose con la misma fuerza aunque pasen décadas, y muchas mueren por accidentes o depredadores, no por hacerse viejas.", "lobster", "lobster underwater"),
            _f("Hay estrellas que laten como un corazón. Se hinchan y se encogen con un ritmo regular, cambiando de brillo, y los astrónomos usan ese pulso para medir distancias en el universo.", "pulsating star", "star space"),
        ],
    },
    24: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("la saliva de las aves que construye nidos comestibles, el rayo de luz que "
                    "tarda cien mil años en salir del Sol, el pulpo que cambia de textura, la nieve "
                    "roja de los glaciares y el corazón que no para nunca"),
        "segments": [
            _f("Hay pájaros que arman su nido solo con su propia saliva, y la gente lo come como manjar. Esa saliva se endurece al aire y forma una copa, con la que preparan una sopa carísima en Asia.", "swift nest", "bird nest cave"),
            _T(),
            _f("La luz que te calienta tarda más que toda la historia humana en salir del Sol. Nace en el centro y choca tanto adentro que puede demorar cien mil años en llegar a la superficie.", "sun surface", "solar flare"),
            _f("El pulpo no solo cambia de color, también cambia la textura de su piel. Puede volverse liso o lleno de bultos para imitar una roca o un coral y desaparecer ante tus ojos.", "octopus camouflage", "octopus skin"),
            _f("Hay nieve que se tiñe de rojo sangre en los glaciares. La pintan unas algas que viven en el hielo y se protegen del sol con un pigmento rojo, por eso la llaman nieve de sandía.", "red snow glacier", "watermelon snow"),
            _f("Tu corazón genera tanta presión que podría lanzar un chorro de sangre a varios metros de altura. Bombea con esa fuerza cada segundo, toda tu vida, sin tomarse jamás un descanso.", "beating heart", "heart pump"),
        ],
    },
    25: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("el cielo que se vería violeta si nuestros ojos fueran distintos, el pez que "
                    "camina fuera del agua, la montaña que sigue creciendo, el oso que no hace pis en "
                    "invierno y la galaxia que choca con la nuestra"),
        "segments": [
            _f("El cielo en realidad dispersa más la luz violeta que la azul, pero lo vemos celeste. Nuestros ojos son mucho más sensibles al azul, así que el violeta se pierde y ganamos un cielo celeste.", "blue sky", "sky clouds"),
            _T(),
            _f("Hay peces que pueden caminar y respirar fuera del agua. El pez cabeza de serpiente se arrastra por tierra de un charco a otro y aguanta días afuera buscando agua nueva.", "walking fish", "snakehead fish"),
            _f("El Everest crece unos pocos milímetros cada año. Las placas de la India y Asia siguen chocando y empujando la cordillera hacia arriba, así que la montaña más alta cada vez lo es más.", "mount everest", "himalayas"),
            _f("Los osos no hacen pis ni caca en todo su sueño de invierno. Su cuerpo recicla sus propios desechos durante meses y los convierte otra vez en proteína para no gastar músculo.", "hibernating bear", "brown bear"),
            _f("Nuestra galaxia va a chocar con la galaxia vecina. Andrómeda viene hacia nosotros y en miles de millones de años se fusionará con la Vía Láctea para formar una galaxia gigante nueva.", "andromeda galaxy", "galaxy collision"),
        ],
    },
    26: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("el sonido que viaja más rápido bajo el agua, las ratas que ríen cuando las "
                    "hacen cosquillas, el planeta donde el día dura lo mismo que el año, los árboles "
                    "que se avisan del peligro y el hueso más chico del cuerpo"),
        "segments": [
            _f("El sonido viaja más de cuatro veces más rápido bajo el agua que en el aire. Por eso las ballenas se escuchan a cientos de kilómetros: en el mar el sonido corre muchísimo más lejos y veloz.", "whale sound", "underwater ocean"),
            _T(),
            _f("Las ratas se ríen cuando les hacés cosquillas. Sueltan unos chillidos muy agudos que no oímos, y hasta persiguen la mano que las acaricia buscando que sigan jugando con ellas.", "rat", "laboratory rat"),
            _f("La Luna siempre nos muestra la misma cara. Tarda lo mismo en girar sobre sí misma que en dar la vuelta a la Tierra, así que su lado oculto nunca lo vemos desde acá.", "moon far side", "moon surface"),
            _f("Los árboles se avisan del peligro entre ellos. Cuando un insecto ataca a uno, suelta sustancias al aire y por las raíces, y los vecinos preparan sus defensas antes de ser atacados.", "forest trees", "tree roots"),
            _f("El hueso más chico de tu cuerpo está en el oído y es del tamaño de un grano de arroz. Se llama estribo y vibra para que puedas escuchar cada sonido a tu alrededor.", "ear anatomy", "inner ear bones"),
        ],
    },
    27: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("el relincho del planeta hecho de agua hirviendo, los pelos de oso polar "
                    "transparentes, el animal más longevo de la Tierra, el eco que no existe en el "
                    "espacio y las neuronas del intestino"),
        "segments": [
            _f("Hay un planeta cubierto de un océano de agua hirviendo bajo una presión brutal. Está tan caliente y aplastado que el agua se vuelve una forma rarísima, ni líquida ni vapor como la conocemos.", "water planet", "ocean exoplanet"),
            _T(),
            _f("El oso polar no es blanco: su piel es negra y sus pelos son transparentes y huecos. Solo parece blanco porque los pelos reflejan la luz, y la piel oscura le ayuda a absorber el calor del sol.", "polar bear", "polar bear fur"),
            _f("El animal más viejo conocido fue una almeja de más de quinientos años. Nació cuando todavía gobernaban los reyes de hace siglos, y lo supieron contando los anillos de su concha.", "ocean quahog clam", "old clam shell"),
            _f("En el espacio no hay eco ni sonido. Como casi no hay aire para transmitir las vibraciones, una explosión gigantesca sería completamente silenciosa; el silencio ahí arriba es total.", "outer space", "silent space"),
            _f("Tu intestino tiene su propio mini cerebro con millones de neuronas. Por eso sentís mariposas en la panza con los nervios: tu estómago y tu cabeza se mandan mensajes todo el tiempo.", "human intestine", "gut brain"),
        ],
    },
    28: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("el gas que te hace flotar la voz al revés, el pájaro que vuela casi sin parar "
                    "meses, el diamante que es una estrella entera, la medusa sin cerebro que caza y "
                    "el músculo más fuerte del cuerpo"),
        "segments": [
            _f("Hay un gas que hace tu voz grave en vez de aguda, al revés que el helio. Se llama hexafluoruro de azufre, es tan pesado que al respirarlo la voz suena como la de un monstruo gigante.", "heavy gas", "deep voice sound"),
            _T(),
            _f("El vencejo puede volar casi diez meses seguidos sin tocar el suelo. Come, bebe y hasta duerme en pleno vuelo, cerrando medio cerebro por vez para descansar mientras sigue en el aire.", "swift bird flying", "common swift"),
            _f("Hay una estrella muerta que es un diamante del tamaño de un planeta. Su carbono quedó tan comprimido al apagarse que se cristalizó, formando el diamante más grande del universo conocido.", "diamond star", "white dwarf star"),
            _f("Las medusas no tienen cerebro ni corazón y aun así cazan. Usan una red de nervios repartida por todo el cuerpo para detectar la luz y atrapar presas con sus tentáculos venenosos.", "jellyfish glowing", "jellyfish tentacles"),
            _f("El músculo más fuerte de tu cuerpo, por su tamaño, es el de la mandíbula. Puede morder con la fuerza de decenas de kilos, suficiente para partir cosas durísimas de un solo apretón.", "jaw muscle", "human jaw"),
        ],
    },
    29: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("la arena que canta cuando caminás, el pulpo con nueve cerebros, el planeta que "
                    "huele a huevo podrido, la hormiga que levanta cincuenta veces su peso y el color "
                    "que tu ojo no puede ver"),
        "segments": [
            _f("Hay dunas de arena que cantan y rugen cuando la arena se desliza. El roce de millones de granos del mismo tamaño produce un zumbido grave que se oye a kilómetros, como un motor enorme.", "sand dunes", "desert dune"),
            _T(),
            _f("El pulpo tiene nueve cerebros: uno central y uno en cada brazo. Por eso cada brazo puede resolver cosas por su cuenta, como abrir un frasco, mientras el cerebro principal piensa en otra cosa.", "octopus brain", "octopus arms"),
            _f("Hay un planeta gigante que apesta a huevo podrido. Su atmósfera está llena de un gas con olor nauseabundo, el mismo que hace que los huevos descompuestos huelan tan mal.", "gas giant planet", "exoplanet space"),
            _f("Una hormiga puede levantar hasta cincuenta veces su propio peso. Sería como si vos cargaras un auto con los dientes; sus músculos diminutos son increíblemente potentes para su tamaño.", "ant lifting", "ant macro"),
            _f("Existen colores que tu ojo jamás podrá ver, aunque están ahí. Abejas y aves ven la luz ultravioleta, así que las flores tienen dibujos secretos que para ellas brillan y para nosotros no.", "ultraviolet flower", "bee vision"),
        ],
    },
    30: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("el relámpago volcánico, el animal que puede sobrevivir sin cabeza, la luna con "
                    "océano bajo el hielo, el pelo que sigue creciendo años y el planeta más veloz "
                    "del sistema solar"),
        "segments": [
            _f("En las erupciones de los volcanes también caen rayos. Las partículas de ceniza chocan y se cargan de electricidad como en una tormenta, y entonces estallan relámpagos en medio del humo y el fuego.", "volcanic lightning", "volcano eruption"),
            _T(),
            _f("La cucaracha puede vivir más de una semana sin cabeza. Respira por agujeritos en el cuerpo, no por la boca, así que solo muere de sed porque no puede tomar agua sin cabeza.", "cockroach", "cockroach insect"),
            _f("Una luna de Júpiter esconde más agua que toda la Tierra bajo su hielo. Debajo de su corteza congelada hay un océano gigante, uno de los lugares donde más se busca vida fuera de nuestro planeta.", "europa moon", "icy moon jupiter"),
            _f("Un solo pelo de tu cabeza puede crecer durante hasta seis años seguidos antes de caer. Por eso algunas personas logran dejarse el pelo larguísimo: cada hebra vive años antes de renovarse.", "long hair", "hair strand"),
            _f("Mercurio es el planeta más veloz: corre alrededor del Sol a casi ciento setenta mil kilómetros por hora. Está tan cerca de la estrella que apura el paso para no caerse hacia ella.", "mercury planet", "mercury orbit"),
        ],
    },
    31: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("el axolote que regenera hasta partes del cerebro, los lagos de metano "
                    "de Titán, por qué el Mar Muerto no te deja hundir, el pez arquero que "
                    "dispara agua y el número googol más grande que los átomos del universo"),
        "segments": [
            _f("El axolote puede regenerar casi cualquier parte de su cuerpo, incluso partes del corazón y del cerebro. Le podés cortar una pata y le vuelve a crecer perfecta, con huesos y nervios, sin cicatriz.", "axolotl", "axolotl aquarium"),
            _T(),
            _f("En Titán, la luna más grande de Saturno, llueve metano y hay lagos y ríos de metano líquido. Hace tanto frío, casi ciento ochenta grados bajo cero, que lo que acá es gas allá corre como agua.", "titan moon saturn", "methane lake"),
            _f("En el Mar Muerto es casi imposible hundirse. Tiene casi diez veces más sal que el océano, y esa sal vuelve al agua tan densa que el cuerpo flota solo, como un corcho.", "dead sea", "dead sea floating"),
            _f("El pez arquero caza insectos disparándoles un chorro de agua desde abajo. Apunta con tanta puntería que los derriba de las hojas a más de un metro de distancia, corrigiendo hasta la distorsión del agua.", "archerfish", "archerfish spitting"),
            _f("Un googol es un uno seguido de cien ceros, y es un número más grande que la cantidad de átomos de todo el universo observable. Lo inventó un nene de nueve años, y de ahí viene el nombre de Google.", "number zero", "blackboard math"),
        ],
    },
    32: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("los volcanes de Ío, la anguila eléctrica que da calambre, por qué se te "
                    "pone la piel de gallina, el lago Baikal con un quinto del agua dulce y "
                    "la Universidad de Oxford más vieja que los aztecas"),
        "segments": [
            _f("Ío, una luna de Júpiter, es el lugar con más volcanes activos del sistema solar. Júpiter la estira y la aprieta con su gravedad hasta ponerla al rojo vivo por dentro, y lanza lava a cientos de kilómetros de altura.", "io moon jupiter", "volcano eruption"),
            _T(),
            _f("La anguila eléctrica puede generar una descarga de hasta ochocientos voltios, más que un enchufe de pared. La usa para aturdir a sus presas y defenderse, y puede derribar a un caballo.", "electric eel", "eel underwater"),
            _f("La piel de gallina es una herencia de cuando teníamos mucho pelo. Los músculos diminutos erizan el vello para parecer más grandes ante el peligro o atrapar aire y dar calor, aunque ya casi no nos sirve.", "goosebumps skin", "arm hair"),
            _f("El lago Baikal, en Siberia, guarda casi un quinto de toda el agua dulce sin congelar del planeta. Es el lago más profundo del mundo, con más de un kilómetro y medio hasta el fondo.", "lake baikal", "siberia lake"),
            _f("La Universidad de Oxford es más vieja que el imperio azteca. Ya daba clases en el año mil noventa y seis, más de dos siglos antes de que se fundara la ciudad azteca de Tenochtitlán.", "oxford university", "old university"),
        ],
    },
    33: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("el ornitorrinco que suda leche y detecta electricidad, por qué en "
                    "Neptuno y Urano llueven diamantes, la lengua del oso hormiguero, el "
                    "desierto de Atacama donde nunca llovió y Shakespeare inventor de palabras"),
        "segments": [
            _f("El ornitorrinco no tiene pezones: suda la leche por la piel y las crías la lamen del pelo. Además detecta la electricidad de sus presas con el pico y es uno de los pocos mamíferos venenosos.", "platypus", "platypus swimming"),
            _T(),
            _f("En Neptuno y Urano probablemente llueven diamantes. La presión enorme aprieta el carbono de su atmósfera hasta formar diamantes que caen hacia el interior como un granizo brillante.", "neptune planet", "diamond"),
            _f("El oso hormiguero gigante no tiene dientes y su lengua mide más de medio metro. La saca y la mete hasta ciento cincuenta veces por minuto para atrapar más de treinta mil hormigas por día.", "anteater", "anteater tongue"),
            _f("En el centro del desierto de Atacama, en Chile, hay zonas donde no se registró una sola lluvia en siglos. Es tan parecido a Marte que la NASA prueba ahí sus robots.", "atacama desert", "desert chile"),
            _f("Shakespeare inventó o registró por primera vez más de mil setecientas palabras que seguimos usando. De él vienen términos tan comunes que hoy ni imaginamos que alguien los tuvo que crear.", "shakespeare", "old book writing"),
        ],
    },
    34: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("el narval con un diente de dos metros, por qué el helio se escapa de "
                    "la Tierra, el topo de nariz estrellada ultrarrápido, el Salto Ángel más "
                    "alto del mundo y por qué tenés un hueso que ya no usás"),
        "segments": [
            _f("El cuerno del narval no es un cuerno: es un diente que le crece atravesando el labio y puede medir más de dos metros. Está lleno de nervios, así que en realidad es un sentido gigante para percibir el agua.", "narwhal", "narwhal arctic"),
            _T(),
            _f("El helio es el único elemento que se escapa de la Tierra para siempre. Es tan liviano que sube hasta lo más alto de la atmósfera y el viento solar lo arranca al espacio, sin posibilidad de volver.", "helium balloon", "atmosphere space"),
            _f("El topo de nariz estrellada es el animal que come más rápido del mundo: identifica y traga una presa en menos de un cuarto de segundo. Su nariz tiene veintidós tentáculos que tocan como veinticinco mil veces por segundo.", "star nosed mole", "mole animal"),
            _f("El Salto Ángel, en Venezuela, es la catarata más alta del mundo, con casi mil metros de caída. Es tan alta que en días cálidos el agua se evapora antes de tocar el suelo.", "angel falls venezuela", "waterfall jungle"),
            _f("Tenés un músculo en la muñeca que ya no todos los humanos traen. Si doblás la mano y aparece un tendón marcado, lo tenés; a una de cada diez personas directamente le falta y no pasa nada.", "wrist tendon", "human hand anatomy"),
        ],
    },
    35: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("el escarabajo bombardero que dispara ácido hirviendo, por qué el cero "
                    "absoluto es el frío límite, la rana que se congela y revive, Venus donde "
                    "llueve ácido y la última guillotina usada en mil novecientos setenta y siete"),
        "segments": [
            _f("El escarabajo bombardero se defiende disparando un chorro de líquido hirviendo por la cola. Mezcla dos químicos dentro del cuerpo que explotan a cien grados y salen con un estallido justo a la cara del atacante.", "bombardier beetle", "beetle insect"),
            _T(),
            _f("Existe una temperatura mínima que no se puede bajar: el cero absoluto, doscientos setenta y tres grados bajo cero. A esa temperatura los átomos casi dejan de moverse, y es imposible enfriar algo más que eso.", "frost ice", "cold thermometer"),
            _f("La rana de bosque de Alaska se congela entera en invierno: se le para el corazón y deja de respirar. En primavera se descongela y vuelve a la vida como si nada, gracias a un anticongelante natural en la sangre.", "wood frog", "frozen frog ice"),
            _f("En Venus no solo hace un calor infernal: también llueve ácido sulfúrico. Las nubes son de ácido, aunque es tan caliente que las gotas se evaporan antes de llegar al suelo.", "venus clouds", "acid rain"),
            _f("La guillotina no es solo cosa de la Revolución Francesa: Francia la usó para ejecutar hasta mil novecientos setenta y siete, el mismo año en que se estrenó la primera Star Wars.", "guillotine", "old france paris"),
        ],
    },
    36: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("el ave lira que imita motosierras, por qué saltarías más alto en la "
                    "Luna, la salamandra que respira sin pulmones, el relámpago del Catatumbo "
                    "casi eterno y por qué dos ríos pueden correr sin mezclarse"),
        "segments": [
            _f("El ave lira australiana imita cualquier sonido que escucha: el canto de otros pájaros, una motosierra, el obturador de una cámara o hasta una alarma de auto. Lo hace tan perfecto que es imposible distinguir el original.", "lyrebird", "australian bird"),
            _T(),
            _f("En la Luna podrías saltar seis veces más alto que en la Tierra. Su gravedad es seis veces más débil, por eso los astronautas se movían a los saltos, como en cámara lenta.", "astronaut moon", "moon surface"),
            _f("Muchas salamandras no tienen pulmones y respiran enteramente por la piel. Para que funcione, su piel tiene que estar siempre húmeda, por eso viven cerca del agua y debajo de las piedras.", "salamander", "salamander forest"),
            _f("Sobre el lago de Maracaibo, en Venezuela, cae un relámpago casi todas las noches del año, a veces casi trescientos días. Le dicen el relámpago del Catatumbo y es el lugar con más rayos del planeta.", "lightning lake", "catatumbo lightning"),
            _f("En el punto donde se encuentran dos ríos, a veces sus aguas no se mezclan: el Amazonas tiene un tramo donde corren dos aguas de distinto color lado a lado por kilómetros, por diferencias de temperatura y velocidad.", "river confluence", "amazon river"),
        ],
    },
    37: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("el pepino de mar que se defiende con las tripas, el centro de la Tierra "
                    "tan caliente como el Sol, el pez que vive más de doscientos años, el punto "
                    "más profundo del Gran Cañón al revés y por qué hay más árboles que estrellas"),
        "segments": [
            _f("El pepino de mar, cuando se siente amenazado, expulsa sus propios órganos internos por el ano para enredar y distraer al atacante. Después, tranquilo, le vuelven a crecer. Literalmente se escapa dejando las tripas atrás.", "sea cucumber", "sea cucumber ocean"),
            _T(),
            _f("El centro de la Tierra está tan caliente como la superficie del Sol: unos seis mil grados. Ese calor sobró de cuando se formó el planeta y mantiene el núcleo de hierro girando, lo que nos da el campo magnético.", "earth core", "molten lava"),
            _f("El tiburón de Groenlandia es el vertebrado que más vive: puede pasar los cuatrocientos años. Eso significa que algunos que nadan hoy ya existían antes de que naciera Napoleón.", "greenland shark", "shark arctic"),
            _f("En la Tierra hay más de tres billones de árboles, muchísimos más que las estrellas de nuestra galaxia, la Vía Láctea, que son unos cien mil millones.", "forest trees", "aerial forest"),
            _f("Tus ojos tienen un punto ciego: una zona donde no ven nada, justo donde el nervio sale del ojo. No lo notás porque el cerebro rellena el hueco inventando lo que debería haber ahí.", "human eye", "optical illusion"),
        ],
    },
    38: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("la rata topo desnuda que casi no envejece ni siente dolor, por qué cerca "
                    "de un agujero negro el tiempo se frena, el calamar vampiro de las "
                    "profundidades, la Antártida como el desierto más grande y las palabras del euskera"),
        "segments": [
            _f("La rata topo desnuda casi no envejece, casi nunca tiene cáncer y no siente cierto tipo de dolor. Vive bajo tierra hasta treinta años, diez veces más que un ratón común, y los científicos la estudian para entender la vejez.", "naked mole rat", "underground tunnel"),
            _T(),
            _f("Cerca de un agujero negro, el tiempo pasa más lento. Su gravedad es tan brutal que, si te acercaras y volvieras, para vos habrían pasado minutos, pero en la Tierra habrían pasado años.", "black hole", "space time"),
            _f("El calamar vampiro vive donde casi no hay oxígeno, en las profundidades oscuras del océano. No ataca: se defiende dándose vuelta como un paraguas lleno de púas y lanzando moco brillante en vez de tinta.", "vampire squid", "deep sea creature"),
            _f("El desierto más grande del mundo no tiene arena: es la Antártida. Un desierto se define por lo poco que llueve o nieva, y ahí casi no cae agua nueva, así que es un desierto helado gigante.", "antarctica", "ice desert"),
            _f("El euskera, el idioma del País Vasco, no se parece a ningún otro idioma del mundo. Los lingüistas no le encontraron parientes: ya se hablaba antes de que llegaran el latín y las lenguas que hoy dominan Europa.", "basque country", "old language book"),
        ],
    },
    39: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("la hidra que no parece envejecer, por qué en Marte el cielo es rojo de "
                    "día y azul al atardecer, el camaleón que mueve los ojos por separado, el "
                    "géiser que no para y por qué el ADN estirado llega al Sol muchas veces"),
        "segments": [
            _f("La hidra, un animalito de agua dulce de pocos milímetros, parece no envejecer nunca. Reemplaza sus células todo el tiempo, así que un ejemplar podría vivir, en teoría, para siempre si no se lo comen.", "hydra freshwater", "microorganism"),
            _T(),
            _f("En Marte el cielo es rosado o anaranjado de día y se vuelve azul al atardecer, justo al revés que acá. El polvo del aire tiñe todo de rojo, pero cerca del Sol poniente deja pasar el azul.", "mars surface", "mars sky sunset"),
            _f("El camaleón mueve cada ojo por su cuenta y puede mirar en dos direcciones a la vez. Así vigila casi todo lo que lo rodea, y cuando ve una presa junta los dos ojos para calcular la distancia.", "chameleon", "chameleon eye"),
            _f("Si estiraras todo el ADN de una sola de tus células, mediría unos dos metros. Y si juntaras el de todas tus células, alcanzaría para ir y volver al Sol cientos de veces.", "dna helix", "cell biology"),
            _f("El géiser Old Faithful, en Estados Unidos, explota casi puntual cada hora y media y lanza agua hirviendo a más de cuarenta metros. Lleva así más de un siglo, como un reloj natural.", "old faithful geyser", "yellowstone geyser"),
        ],
    },
    40: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("la medusa avispa de mar y su veneno brutal, por qué la Luna se aleja "
                    "cada año, el colibrí que late mil veces por minuto, el punto más caliente "
                    "de la Tierra en Irán y por qué tu cuerpo brilla sin que lo veas"),
        "segments": [
            _f("La avispa de mar, una medusa transparente de Australia, tiene uno de los venenos más potentes que existen. Sus tentáculos pueden medir tres metros y el dolor es tan fuerte que puede detener el corazón.", "box jellyfish", "jellyfish ocean"),
            _T(),
            _f("La Luna se aleja de la Tierra casi cuatro centímetros por año, lo mismo que crecen tus uñas. Por eso, hace millones de años se veía mucho más grande en el cielo.", "moon earth", "full moon"),
            _f("El corazón de un colibrí puede latir más de mil doscientas veces por minuto cuando vuela. Baten las alas tan rápido que zumban, y necesitan comer casi sin parar para no quedarse sin energía.", "hummingbird", "hummingbird flower"),
            _f("El lugar con la temperatura de superficie más alta medida está en el desierto de Lut, en Irán: más de setenta grados en el suelo. Es tan extremo que en algunas zonas ni las bacterias sobreviven.", "lut desert iran", "hot desert sand"),
            _f("Tu cuerpo emite luz propia, pero tan débil que no la podés ver. Es un brillo mil veces más tenue de lo que el ojo humano detecta, producto de las reacciones químicas dentro de tus células.", "human body glow", "bioluminescence dark"),
        ],
    },
    41: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("el pez de hielo con sangre transparente, por qué Tritón gira al revés, "
                    "la cabra que se desmaya del susto, por qué el agua caliente se congela "
                    "antes que la fría y cuántos glóbulos rojos fabricás por segundo"),
        "segments": [
            _f("El pez de hielo de la Antártida tiene la sangre transparente: es el único vertebrado sin glóbulos rojos. En aguas tan frías y con tanto oxígeno disuelto, le alcanza con llevarlo directamente en el plasma.", "icefish antarctica", "transparent fish"),
            _T(),
            _f("Tritón, la luna más grande de Neptuno, gira al revés que su planeta. Es la única luna grande que lo hace, y por eso creen que no nació ahí, sino que Neptuno la capturó de afuera.", "triton moon neptune", "neptune space"),
            _f("Hay una raza de cabras que se desmaya cuando se asusta. No se duermen: los músculos se les tildan unos segundos por un gen, se quedan tiesas y se caen, pero enseguida se levantan como si nada.", "fainting goat", "goat farm"),
            _f("A veces el agua caliente se congela más rápido que la fría. Es un efecto raro que todavía sorprende a los científicos, y lo notó un estudiante de secundaria en Tanzania haciendo helados.", "ice cubes freezer", "frozen water"),
            _f("Cada segundo, tu cuerpo produce unos dos millones de glóbulos rojos nuevos para reemplazar a los que mueren. Si los pusieras en fila, todos los de tu sangre darían varias vueltas a la Tierra.", "red blood cells", "blood microscope"),
        ],
    },
    42: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("el pez gota que en el fondo del mar es normal, por qué un día en la Luna "
                    "dura un mes, la mantarraya con el cerebro más grande entre los peces, el "
                    "lago rosado de sal y por qué estás hecho de polvo de estrellas"),
        "segments": [
            _f("El pez gota, famoso por su cara triste, en realidad solo se ve así fuera del agua. En el fondo del mar, donde la presión es enorme, tiene forma normal de pez; se deforma cuando lo sacan a la superficie.", "blobfish", "deep sea fish"),
            _T(),
            _f("Un día completo en la Luna, de un amanecer al siguiente, dura casi un mes terrestre. Por eso cada punto de la Luna pasa unos catorce días con sol y otros catorce a oscuras y heladísimo.", "moon day", "lunar surface"),
            _f("Las mantarrayas tienen el cerebro más grande en relación al cuerpo de todos los peces. Son tan inteligentes que parecen reconocerse en un espejo, algo que casi ningún animal logra.", "manta ray", "manta ray ocean"),
            _f("El agua del Danakil, en Etiopía, es una de las más extremas del mundo: ácida, hirviendo y de colores amarillo y verde brillante. Parece otro planeta, pero ahí abajo igual viven microbios.", "danakil depression", "colorful acid lake"),
            _f("Casi todos los átomos de tu cuerpo, salvo el hidrógeno, se fabricaron dentro de estrellas que explotaron hace miles de millones de años. Literalmente estás hecho de polvo de estrellas.", "supernova explosion", "stardust nebula"),
        ],
    },
    43: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("el gusano Bobbit que ataca desde la arena, por qué casi todo el oxígeno "
                    "lo hace el mar, la foca de Weddell que bucea una hora, el vacío de Boötes "
                    "casi sin galaxias y por qué no podés tragar y respirar a la vez"),
        "segments": [
            _f("El gusano Bobbit vive enterrado en la arena del mar y puede medir tres metros. Saca solo la cabeza y, cuando un pez pasa cerca, lo agarra tan rápido y con tanta fuerza que a veces lo parte en dos.", "bobbit worm", "sea worm sand"),
            _T(),
            _f("La mayoría del oxígeno que respirás no viene de los árboles, sino del mar. Unas algas microscópicas, el fitoplancton, producen más de la mitad del oxígeno del planeta.", "phytoplankton", "ocean algae"),
            _f("La foca de Weddell puede aguantar más de una hora bajo el agua con una sola respiración y bajar a más de seiscientos metros. Guarda el oxígeno en los músculos y la sangre, no en los pulmones.", "weddell seal", "seal antarctica"),
            _f("Existe una zona del universo casi vacía, el vacío de Boötes: una burbuja gigante de cientos de millones de años luz donde casi no hay galaxias. Si viviéramos ahí, de noche el cielo estaría casi negro.", "cosmic void", "empty space galaxies"),
            _f("No podés respirar y tragar al mismo tiempo. Tu garganta usa el mismo tubo para el aire y la comida, y una tapita se cierra al tragar para que nada se te vaya al pulmón.", "human throat anatomy", "swallowing diagram"),
        ],
    },
    44: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("la zarigüeya inmune a casi todos los venenos, por qué Mercurio se achica, "
                    "el pez linterna que pesca con luz, el acantilado del Monte Thor casi "
                    "vertical y por qué los gatos domésticos comparten antepasado con el tigre"),
        "segments": [
            _f("La zarigüeya es casi inmune a los venenos de serpiente. Su sangre tiene una proteína que neutraliza el veneno, y los científicos la estudian para fabricar antídotos para humanos.", "opossum", "opossum animal"),
            _T(),
            _f("Mercurio se está achicando. Al enfriarse por dentro, el planeta se encoge como una fruta que se seca, y su superficie quedó arrugada con escalones gigantes de hasta cientos de kilómetros.", "mercury planet", "mercury surface"),
            _f("El pez linterna, de las profundidades, tiene un órgano con bacterias que brillan debajo de los ojos. Lo usa como una linterna para ver, atraer presas y comunicarse en la oscuridad total del mar.", "lanternfish", "deep sea glow"),
            _f("El Monte Thor, en Canadá, tiene la pared vertical más alta del mundo: más de mil doscientos metros de caída casi recta. Si tiraras una piedra desde arriba, no tocaría la roca hasta el fondo.", "mount thor canada", "vertical cliff"),
            _f("Tu gato doméstico comparte un antepasado con el tigre y el león. Por eso conserva gestos salvajes como marcar territorio, acechar y afilar las garras, aunque viva en un sillón.", "domestic cat", "tiger wild cat"),
        ],
    },
    45: {
        "pregunta": "¿Qué dato sabés vos?",
        "resumen": ("el pulpo dumbo de las profundidades, por qué un día terrestre dura cada "
                    "vez más, el pájaro que duerme volando, el Caspio que es el lago más grande "
                    "del mundo y por qué sentís mariposas en la panza cuando tenés nervios"),
        "segments": [
            _f("El pulpo Dumbo vive a miles de metros de profundidad y se mueve agitando dos aletas que parecen las orejas del elefante Dumbo. Es uno de los pulpos que vive más profundo de todos.", "dumbo octopus", "deep sea octopus"),
            _T(),
            _f("Los días en la Tierra se están alargando muy de a poco. La Luna nos frena con su gravedad, así que hace cientos de millones de años un día duraba solo unas veintidós horas, no veinticuatro.", "earth rotation", "day night earth"),
            _f("La fragata puede dormir mientras vuela. Apaga la mitad del cerebro por vez y sigue planeando, lo que le permite pasar semanas en el aire sin bajar a tierra.", "frigatebird", "seabird flying"),
            _f("El mar Caspio, entre Europa y Asia, no es un mar: es el lago más grande del mundo. Es tan enorme que lo llamaron mar, pero está cerrado por tierra por todos lados.", "caspian sea", "large lake aerial"),
            _f("Cuando estás nervioso sentís mariposas en la panza porque el miedo manda la sangre a los músculos y frena la digestión. El estómago reacciona a esa señal del cuerpo preparándose para huir o pelear.", "butterflies stomach", "nervous person"),
        ],
    },
}


def title_for(part: int) -> str:
    """Título del episodio (interfaz común de los módulos de serie)."""
    return f"Datos para parecer inteligente pt. {part}"


def _merge_generados() -> None:
    """Mergea los episodios generados y aprobados (Pieza 2) sobre los hardcodeados, con keys
    contiguas tras el último hardcodeado (46+). No pisa los 45 curados. Lo relee importlib.reload
    (que usa el runway del auto-refill), así los nuevos aparecen apenas se aprueban."""
    try:
        from autoscripts import db as _adb
        generados = _adb.approved_episodes("faceless")
    except Exception:
        return
    base = max(PARTS)
    for i, ep in enumerate(generados, start=1):
        PARTS[base + i] = ep


_merge_generados()
