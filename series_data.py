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
]


def background_for(part: int) -> str:
    """Fondo rotativo según el número de parte."""
    return BACKGROUNDS[(part - 1) % len(BACKGROUNDS)]


def _T():
    return {"kind": "title", "text": TITULO_PANTALLA}


def _f(text, *imgs):
    return {"kind": "fact", "text": text, "imgs": list(imgs)}


PARTS = {
    1: {
        "resumen": ("por qué el pulpo tiene sangre azul, por qué en Venus un día dura más que un "
                    "año, por qué la miel nunca caduca, por qué un rayo es más caliente que el Sol "
                    "y por qué Saturno flotaría en el agua"),
        "segments": [
            _f("El pulpo tiene tres corazones y su sangre es azul. Dos bombean a las branquias y el tercero al resto del cuerpo, y es azul porque usa cobre en vez de hierro.", "octopus", "octopus underwater"),
            _T(),
            _f("En Venus, un día dura más que un año. Gira tan lento que tarda doscientos cuarenta y tres días en girar sobre sí mismo, pero solo doscientos veinticinco en rodear al Sol.", "venus planet", "venus surface"),
            _f("La miel nunca se echa a perder. Encontraron miel de tres mil años en tumbas egipcias, todavía comestible. Casi no tiene agua y es muy ácida, así que ninguna bacteria sobrevive adentro.", "honey", "honeycomb"),
            _f("Un rayo es cinco veces más caliente que la superficie del Sol: llega a treinta mil grados. Calienta el aire tan rápido que explota, y ese estallido es el trueno.", "lightning", "lightning storm"),
            _f("Saturno es tan liviano que flotaría en el agua. Está hecho casi solo de gas, así que es menos denso que el agua. Seguime para la parte dos.", "saturn planet", "saturn rings"),
        ],
    },
    2: {
        "resumen": ("cuántas estrellas hay en el universo, las huellas de los koalas, por qué la "
                    "Torre Eiffel crece en verano, las abejas que reconocen caras y por qué el "
                    "plátano es radiactivo"),
        "segments": [
            _f("Hay más estrellas en el universo que granos de arena en toda la Tierra. Son tantas que, si contaras una por segundo, tardarías más que la edad del universo en terminar.", "galaxy", "stars night sky"),
            _T(),
            _f("Los koalas tienen huellas dactilares casi idénticas a las nuestras. Son tan parecidas que, bajo un microscopio, hasta un experto podría confundirlas con huellas humanas.", "koala", "koala tree"),
            _f("La Torre Eiffel crece en verano. El calor dilata el metal y la torre puede medir hasta quince centímetros más alta que en invierno, cuando el frío la encoge de nuevo.", "eiffel tower", "paris"),
            _f("Las abejas pueden reconocer caras humanas. Combinan los rasgos como si armaran un rompecabezas, la misma técnica que usamos nosotros, aunque su cerebro es más chico que una semilla.", "bee", "honeybee flower"),
            _f("El plátano es levemente radiactivo por su potasio. Es tan poco que necesitarías comer millones de golpe para que sea un problema. Seguime para la parte tres.", "banana", "bananas"),
        ],
    },
    3: {
        "resumen": ("los tardígrados que sobreviven en el espacio, Cleopatra más cerca de la Luna "
                    "que de las pirámides, por qué los flamencos son rosados, el planeta donde "
                    "llueve vidrio y cuánto ADN compartimos con un plátano"),
        "segments": [
            _f("Los tardígrados pueden sobrevivir en el espacio exterior. Estos bichos microscópicos aguantan el vacío, la radiación y el frío extremo. Los mandaron al espacio sin traje y volvieron vivos.", "tardigrade", "microscope"),
            _T(),
            _f("Cleopatra vivió más cerca de la llegada a la Luna que de la construcción de las pirámides. Para ella, las pirámides ya eran ruinas antiquísimas. La historia es larguísima.", "pyramids egypt", "egypt"),
            _f("Los flamencos nacen grises, no rosados. Se vuelven rosados por lo que comen: camarones y algas con pigmentos que tiñen sus plumas. Si dejaran de comerlos, volverían a ser pálidos.", "flamingo", "flamingos"),
            _f("Existe un planeta donde llueve vidrio de costado. Sus vientos superan los siete mil kilómetros por hora y lanzan partículas de vidrio fundido en horizontal.", "exoplanet", "planet space"),
            _f("Compartís más de la mitad de tu ADN con un plátano. Aunque no se parezcan en nada, gran parte de las instrucciones básicas de la vida son iguales en casi todos los seres. Seguime para la parte cuatro.", "dna", "banana"),
        ],
    },
    4: {
        "resumen": ("los átomos de una cucharada de agua, los delfines que se ponen nombres, la "
                    "montaña más alta de verdad, las nutrias que duermen de la mano y cuál es el "
                    "planeta más caliente"),
        "segments": [
            _f("Hay más átomos en una cucharada de agua que estrellas en todo el universo observable. Los átomos son tan minúsculos que su número es imposible de imaginar.", "water drop", "galaxy"),
            _T(),
            _f("Los delfines se ponen nombres. Cada uno inventa un silbido único para sí mismo, y los demás lo usan para llamarlo, igual que un nombre propio entre nosotros.", "dolphin", "dolphins ocean"),
            _f("El Everest no es la montaña más alta si medís desde la base. El volcán Mauna Kea, en Hawái, es más alto, pero casi todo su cuerpo está bajo el agua.", "mount everest", "mountain"),
            _f("Las nutrias duermen tomadas de la mano. Lo hacen para no separarse con la corriente mientras flotan, y a veces se envuelven en algas como si fueran un cinturón.", "otter", "sea otter"),
            _f("El planeta más caliente no es Mercurio, es Venus. Su atmósfera atrapa tanto calor que supera los cuatrocientos grados, suficiente para derretir plomo. Seguime para la parte cinco.", "venus planet", "planet"),
        ],
    },
    5: {
        "resumen": ("por qué el estómago no se digiere a sí mismo, los pulpos que saborean con los "
                    "brazos, el material más duro del cuerpo, las lunas de Saturno y los pingüinos "
                    "que regalan piedras"),
        "segments": [
            _f("Tu estómago fabrica una capa nueva cada pocos días para no digerirse a sí mismo. Sus ácidos podrían disolver metal, pero una capa de moco lo protege por dentro.", "stomach anatomy", "human body"),
            _T(),
            _f("Los pulpos saborean con los brazos. Cada ventosa tiene receptores de gusto, así que literalmente prueban todo lo que tocan sin llevárselo a la boca.", "octopus", "octopus tentacles"),
            _f("El esmalte de tus dientes es el material más duro de tu cuerpo, más que el hueso. Pero, a diferencia de los huesos, no se regenera: lo que se rompe no vuelve.", "teeth", "dentist"),
            _f("Saturno tiene más de cien lunas confirmadas. Le ganó a Júpiter como el planeta con más lunas, y todavía siguen descubriendo nuevas cada año.", "saturn planet", "saturn rings"),
            _f("Los pingüinos le regalan piedras a su pareja. El macho busca la piedra más lisa y perfecta y se la ofrece; si la acepta, forman pareja. Seguime para la parte seis.", "penguin", "penguins"),
        ],
    },
    6: {
        "resumen": ("cuántos rayos caen por día, las vacas que tienen mejores amigas, el peso del "
                    "Sol, los caracoles que duermen años y por qué hay más árboles que estrellas en "
                    "la galaxia"),
        "segments": [
            _f("En la Tierra caen unos ocho millones de rayos por día. Eso es casi cien rayos por segundo golpeando el planeta en algún lado, todo el tiempo, sin parar.", "lightning", "storm"),
            _T(),
            _f("Las vacas tienen mejores amigas. Forman vínculos fuertes con otras vacas y su corazón se estresa si las separan, igual que a nosotros cuando extrañamos a alguien.", "cow", "cows field"),
            _f("El Sol es el noventa y nueve por ciento de toda la masa del sistema solar. Todo lo demás, los ocho planetas juntos, es apenas el uno por ciento que sobró.", "sun", "solar system"),
            _f("Algunos caracoles pueden dormir hasta tres años seguidos. Cuando el clima es muy seco, se encierran en su caparazón y bajan tanto su cuerpo que parecen muertos.", "snail", "snail shell"),
            _f("Hay más árboles en la Tierra que estrellas en la Vía Láctea. Se calculan unos tres billones de árboles, muchísimos más que las estrellas de nuestra galaxia. Seguime para la parte siete.", "forest", "trees"),
        ],
    },
    7: {
        "resumen": ("el volcán gigante de Marte, por qué los elefantes no saltan, el billón de "
                    "olores que recordás, el mito de la Muralla China y cuánto dura un año en "
                    "Neptuno"),
        "segments": [
            _f("Marte tiene el volcán más grande del sistema solar. El Monte Olimpo es tres veces más alto que el Everest y tan ancho como un país entero.", "mars planet", "volcano"),
            _T(),
            _f("Los elefantes son los únicos animales que no pueden saltar. Su enorme peso y la forma de sus patas hacen que nunca despeguen las cuatro del suelo a la vez.", "elephant", "elephants"),
            _f("Tu nariz puede recordar más de un billón de olores. Cada aroma queda grabado con una emoción, por eso un olor puede transportarte de golpe a un recuerdo de la infancia.", "nose", "perfume"),
            _f("La Gran Muralla China no se ve desde el espacio a simple vista. Es larguísima, pero demasiado angosta para distinguirla sin ayuda desde la órbita. Es un mito famoso.", "great wall china", "china"),
            _f("Un año en Neptuno dura ciento sesenta y cinco años terrestres. Está tan lejos del Sol que, desde que lo descubrimos, recién completó una vuelta hace poco. Seguime para la parte ocho.", "neptune planet", "planet space"),
        ],
    },
    8: {
        "resumen": ("la medusa inmortal, el tamaño de Júpiter, por qué las jirafas casi no duermen, "
                    "el animal más letal del mundo y cuánta saliva generás en la vida"),
        "segments": [
            _f("Existe una medusa biológicamente inmortal. Cuando envejece o se lastima, puede volver a su etapa de bebé y empezar de nuevo, repitiendo el ciclo, en teoría, para siempre.", "jellyfish", "jellyfish ocean"),
            _T(),
            _f("En Júpiter cabrían más de mil planetas Tierra adentro. Es tan gigante que su Gran Mancha Roja, una sola tormenta, es más grande que todo nuestro planeta.", "jupiter planet", "jupiter"),
            _f("Las jirafas duermen menos de dos horas por día, muchas veces paradas y en siestas de pocos minutos, porque echarse las deja indefensas ante los depredadores.", "giraffe", "giraffes"),
            _f("El animal más letal del mundo es el mosquito. Mata a más humanos por año que cualquier otro, por las enfermedades que transmite, más que tiburones y serpientes juntos.", "mosquito", "mosquito macro"),
            _f("A lo largo de tu vida vas a producir saliva suficiente para llenar dos piscinas. Trabaja todo el día sin que lo notes, ayudándote a tragar y a sentir los sabores. Seguime para la parte nueve.", "swimming pool", "water"),
        ],
    },
    9: {
        "resumen": ("la Luna que se aleja, los gatos que duermen casi toda su vida, el Sahara que "
                    "fue verde, la lluvia de diamantes en los gigantes gaseosos y el corazón del "
                    "colibrí"),
        "segments": [
            _f("La Luna se aleja de la Tierra unos cuatro centímetros por año. Dentro de millones de años los días serán más largos y ya no habrá eclipses totales de Sol como hoy.", "moon", "full moon"),
            _T(),
            _f("Los gatos pasan cerca del setenta por ciento de su vida durmiendo. Un gato de nueve años estuvo despierto solo unos tres. Duermen tanto para ahorrar energía de cazador.", "cat sleeping", "cat"),
            _f("El desierto del Sahara fue verde hace pocos miles de años. Estaba lleno de lagos, ríos y animales, y hay pinturas rupestres que lo prueban. El clima lo convirtió en arena.", "sahara desert", "desert"),
            _f("En Júpiter y Saturno probablemente llueven diamantes. Sus tormentas convierten el carbono en diamante, que cae como granizo brillante a través de la atmósfera.", "saturn planet", "diamond"),
            _f("El corazón de un colibrí late más de mil veces por minuto. Vive tan acelerado que debe comer casi cada diez minutos o no sobrevive. Seguime para la parte diez.", "hummingbird", "hummingbird flower"),
        ],
    },
    10: {
        "resumen": ("los dos billones de galaxias, lo poco que conocemos del océano, los koalas "
                    "dormilones, las alas de las abejas y lo lejos que está la estrella más cercana"),
        "segments": [
            _f("El universo tiene más de dos billones de galaxias, y cada una tiene miles de millones de estrellas. Los números son tan grandes que el cerebro no los puede imaginar.", "galaxy", "galaxies space"),
            _T(),
            _f("Conocemos mejor la Luna que el fondo de nuestros océanos. Más del ochenta por ciento del mar sigue inexplorado; hay mejores mapas de Marte que del fondo marino.", "deep ocean", "underwater"),
            _f("Los koalas duermen hasta veintidós horas por día. Sus hojas de eucalipto son casi tóxicas y dan poquísima energía, así que dormir es su forma de sobrevivir.", "koala", "koala sleeping"),
            _f("Las abejas baten sus alas más de doscientas veces por segundo. Por eso zumban, y por eso pueden volar cargando néctar que pesa casi como ellas.", "bee", "bee flying"),
            _f("La luz del Sol tarda ocho minutos en llegar, pero la de la estrella más cercana tarda cuatro años. Si el Sol se apagara, lo sabríamos ocho minutos después. Seguime, que hay muchas más.", "stars night sky", "sun space"),
        ],
    },
}
