"""Datos de la serie 'Datos para parecer inteligente'.

Cada parte: segmentos (gancho -> título -> resto) + un resumen para la descripción.
El título hablado/en pantalla es el mismo en toda la serie.
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


def _T():
    return {"kind": "title", "text": TITULO_PANTALLA}


PARTS = {
    1: {
        "resumen": ("por qué el pulpo tiene sangre azul, por qué en Venus un día dura más que un "
                    "año, por qué la miel nunca caduca, por qué un rayo es más caliente que el Sol "
                    "y por qué Saturno flotaría en el agua"),
        "segments": [
            {"kind": "fact",
             "text": "El pulpo tiene tres corazones y su sangre es azul. Dos bombean a las branquias y el tercero al resto del cuerpo, y es azul porque usa cobre en vez de hierro.",
             "imgs": ["octopus", "octopus underwater"]},
            _T(),
            {"kind": "fact",
             "text": "En Venus, un día dura más que un año. Gira tan lento que tarda doscientos cuarenta y tres días en girar sobre sí mismo, pero solo doscientos veinticinco en rodear al Sol.",
             "imgs": ["venus planet", "venus surface"]},
            {"kind": "fact",
             "text": "La miel nunca se echa a perder. Encontraron miel de tres mil años en tumbas egipcias, todavía comestible. Casi no tiene agua y es muy ácida, así que ninguna bacteria sobrevive adentro.",
             "imgs": ["honey", "honeycomb"]},
            {"kind": "fact",
             "text": "Un rayo es cinco veces más caliente que la superficie del Sol: llega a treinta mil grados. Calienta el aire tan rápido que explota, y ese estallido es el trueno.",
             "imgs": ["lightning", "lightning storm"]},
            {"kind": "fact",
             "text": "Saturno es tan liviano que flotaría en el agua. Está hecho casi solo de gas, así que es menos denso que el agua. Seguime para la parte dos.",
             "imgs": ["saturn planet", "saturn rings"]},
        ],
    },
    2: {
        "resumen": ("las estrellas contra los granos de arena, las huellas de los koalas, "
                    "la Torre Eiffel que crece en verano, las abejas que reconocen caras, "
                    "cuánto tarda la luz del Sol y por qué el plátano es radiactivo"),
        "segments": [
            {"kind": "fact", "text": "Hay más estrellas en el universo que granos de arena en todas las playas de la Tierra.", "img": "galaxy"},
            _T(),
            {"kind": "fact", "text": "Los koalas tienen huellas dactilares casi idénticas a las de los humanos.", "img": "koala"},
            {"kind": "fact", "text": "La Torre Eiffel puede medir quince centímetros más en verano por el calor.", "img": "eiffel tower"},
            {"kind": "fact", "text": "Las abejas son capaces de reconocer rostros humanos.", "img": "bee"},
            {"kind": "fact", "text": "La luz del Sol tarda ocho minutos en llegar hasta la Tierra.", "img": "sun"},
            {"kind": "fact", "text": "El plátano es levemente radiactivo por su potasio. Seguime para la parte tres.", "img": "banana"},
        ],
    },
    3: {
        "resumen": ("los tardígrados que sobreviven en el espacio, Cleopatra más cerca del iPhone "
                    "que de las pirámides, por qué los flamencos son rosados, el planeta donde "
                    "llueve vidrio y cuánto ADN compartimos con un plátano"),
        "segments": [
            {"kind": "fact", "text": "Los tardígrados pueden sobrevivir en el vacío del espacio exterior.", "img": "tardigrade"},
            _T(),
            {"kind": "fact", "text": "Cleopatra vivió más cerca en el tiempo del primer iPhone que de las pirámides.", "img": "pyramids egypt"},
            {"kind": "fact", "text": "Los flamencos nacen grises y se vuelven rosados por lo que comen.", "img": "flamingo"},
            {"kind": "fact", "text": "Existe un planeta donde llueve vidrio derretido de costado.", "img": "planet space"},
            {"kind": "fact", "text": "Compartimos alrededor del sesenta por ciento de nuestro ADN con un plátano.", "img": "dna"},
            {"kind": "fact", "text": "Napoleón no era bajo: medía la altura promedio de su época. Seguime para la parte cuatro.", "img": "napoleon"},
        ],
    },
    4: {
        "resumen": ("los átomos de una gota de agua, los delfines que se ponen nombres, "
                    "el Everest que crece cada año, las nutrias que duermen de la mano, "
                    "los gatos que no sienten lo dulce y cuál es el planeta más caliente"),
        "segments": [
            {"kind": "fact", "text": "Hay más átomos en una cucharada de agua que estrellas en todo el universo observable.", "img": "water drop"},
            _T(),
            {"kind": "fact", "text": "Los delfines se ponen nombres y se llaman entre sí con silbidos únicos.", "img": "dolphin"},
            {"kind": "fact", "text": "El monte Everest crece unos milímetros cada año.", "img": "mount everest"},
            {"kind": "fact", "text": "Las nutrias se toman de las manos al dormir para no separarse.", "img": "otter"},
            {"kind": "fact", "text": "Los gatos no pueden sentir el sabor dulce.", "img": "cat"},
            {"kind": "fact", "text": "El planeta más caliente es Venus, no Mercurio. Seguime para la parte cinco.", "img": "venus planet"},
        ],
    },
    5: {
        "resumen": ("el estómago que se renueva para no digerirse, los pulpos que saborean con "
                    "los brazos, el esmalte dental, las más de cien lunas de Saturno, los "
                    "pingüinos que regalan piedras y los millones de colores que ve el ojo"),
        "segments": [
            {"kind": "fact", "text": "Tu estómago genera una capa nueva cada pocos días para no digerirse a sí mismo.", "img": "stomach anatomy"},
            _T(),
            {"kind": "fact", "text": "Los pulpos pueden sentir el sabor con sus brazos.", "img": "octopus"},
            {"kind": "fact", "text": "El material más duro de tu cuerpo es el esmalte de los dientes.", "img": "teeth"},
            {"kind": "fact", "text": "Saturno tiene más de cien lunas.", "img": "saturn planet"},
            {"kind": "fact", "text": "Los pingüinos le regalan piedras a su pareja.", "img": "penguin"},
            {"kind": "fact", "text": "El ojo humano puede distinguir unos diez millones de colores. Seguime para la parte seis.", "img": "human eye"},
        ],
    },
    6: {
        "resumen": ("los millones de rayos que caen por día, las vacas que tienen mejores amigas, "
                    "el Sol que es casi toda la masa del sistema solar, los caracoles que duermen "
                    "años, más árboles que estrellas en la galaxia y cuánto late tu corazón"),
        "segments": [
            {"kind": "fact", "text": "En la Tierra caen unos ocho millones de rayos por día.", "img": "lightning"},
            _T(),
            {"kind": "fact", "text": "Las vacas tienen mejores amigas y se estresan si las separan.", "img": "cow"},
            {"kind": "fact", "text": "El Sol representa el noventa y nueve por ciento de la masa de todo el sistema solar.", "img": "sun"},
            {"kind": "fact", "text": "Algunos caracoles pueden dormir hasta tres años seguidos.", "img": "snail"},
            {"kind": "fact", "text": "Hay más árboles en la Tierra que estrellas en la Vía Láctea.", "img": "forest"},
            {"kind": "fact", "text": "Tu corazón late unas cien mil veces por día. Seguime para la parte siete.", "img": "heart"},
        ],
    },
    7: {
        "resumen": ("el volcán gigante de Marte, los elefantes que no pueden saltar, el billón de "
                    "olores que recuerda tu nariz, el mito de la Muralla China desde el espacio, "
                    "los pulpos que abren frascos y cuánto dura un año en Neptuno"),
        "segments": [
            {"kind": "fact", "text": "Marte tiene el volcán más grande del sistema solar: tres veces el Everest.", "img": "mars planet"},
            _T(),
            {"kind": "fact", "text": "Los elefantes son los únicos animales que no pueden saltar.", "img": "elephant"},
            {"kind": "fact", "text": "Tu nariz puede recordar más de un billón de olores distintos.", "img": "nose"},
            {"kind": "fact", "text": "La Gran Muralla China no se ve a simple vista desde el espacio.", "img": "great wall china"},
            {"kind": "fact", "text": "Los pulpos son tan inteligentes que abren frascos desde adentro.", "img": "octopus"},
            {"kind": "fact", "text": "Un año en Neptuno dura ciento sesenta y cinco años terrestres. Seguime para la parte ocho.", "img": "neptune planet"},
        ],
    },
    8: {
        "resumen": ("la medusa inmortal, los mapaches que lavan la comida, el tamaño de Júpiter, "
                    "las jirafas que casi no duermen, cuánta saliva generás en la vida y cuál es "
                    "el animal más letal del mundo"),
        "segments": [
            {"kind": "fact", "text": "Existe una medusa que puede rejuvenecer y volverse biológicamente inmortal.", "img": "jellyfish"},
            _T(),
            {"kind": "fact", "text": "Los mapaches suelen lavar su comida antes de comerla.", "img": "raccoon"},
            {"kind": "fact", "text": "En Júpiter cabrían más de mil planetas Tierra adentro.", "img": "jupiter planet"},
            {"kind": "fact", "text": "Las jirafas duermen menos de dos horas por día.", "img": "giraffe"},
            {"kind": "fact", "text": "A lo largo de tu vida vas a generar saliva suficiente para llenar dos piscinas.", "img": "swimming pool"},
            {"kind": "fact", "text": "El animal más letal del mundo para los humanos es el mosquito. Seguime para la parte nueve.", "img": "mosquito"},
        ],
    },
    9: {
        "resumen": ("la Luna que se aleja cada año, los gatos que duermen casi toda su vida, el "
                    "Sahara que fue verde, las microsiestas de las hormigas, la lluvia de diamantes "
                    "en los gigantes gaseosos y el corazón del colibrí"),
        "segments": [
            {"kind": "fact", "text": "La Luna se aleja de la Tierra unos cuatro centímetros cada año.", "img": "moon"},
            _T(),
            {"kind": "fact", "text": "Los gatos pasan cerca del setenta por ciento de su vida durmiendo.", "img": "cat sleeping"},
            {"kind": "fact", "text": "El desierto del Sahara alguna vez fue verde y estuvo lleno de lagos.", "img": "sahara desert"},
            {"kind": "fact", "text": "Las hormigas no duermen como nosotros: hacen cientos de microsiestas.", "img": "ant"},
            {"kind": "fact", "text": "En Júpiter y Saturno probablemente llueven diamantes.", "img": "saturn planet"},
            {"kind": "fact", "text": "El corazón de un colibrí late más de mil veces por minuto. Seguime para la parte diez.", "img": "hummingbird"},
        ],
    },
    10: {
        "resumen": ("los dos billones de galaxias, los koalas que duermen casi todo el día, el "
                    "océano más profundo que el Everest, las alas de las abejas, el carbono de tu "
                    "cuerpo y lo lejos que está la estrella más cercana"),
        "segments": [
            {"kind": "fact", "text": "El universo tiene más de dos billones de galaxias.", "img": "galaxy"},
            _T(),
            {"kind": "fact", "text": "Los koalas pueden dormir hasta veintidós horas por día.", "img": "koala"},
            {"kind": "fact", "text": "El punto más profundo del océano es más hondo que la altura del Everest.", "img": "deep ocean"},
            {"kind": "fact", "text": "Las abejas baten sus alas más de doscientas veces por segundo.", "img": "bee"},
            {"kind": "fact", "text": "Tu cuerpo tiene suficiente carbono para fabricar unos novecientos lápices.", "img": "pencils"},
            {"kind": "fact", "text": "La luz del Sol tarda ocho minutos en llegar, pero la de la estrella más cercana, cuatro años. Seguime, que esto sigue.", "img": "stars night sky"},
        ],
    },
}
