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
        "resumen": ("el pulpo y su sangre azul, por qué en Venus un día dura más que un año, "
                    "los tiburones más antiguos que los árboles, la miel que nunca caduca, "
                    "los rayos más calientes que el Sol y por qué Saturno flotaría en el agua"),
        "segments": [
            {"kind": "fact", "text": "El pulpo tiene tres corazones y su sangre es azul.", "img": "octopus"},
            _T(),
            {"kind": "fact", "text": "En Venus, un solo día dura más que todo un año.", "img": "venus planet"},
            {"kind": "fact", "text": "Los tiburones existen desde antes que los árboles.", "img": "shark underwater"},
            {"kind": "fact", "text": "La miel nunca se echa a perder, ni en mil años.", "img": "honey"},
            {"kind": "fact", "text": "Un rayo es cinco veces más caliente que la superficie del Sol.", "img": "lightning"},
            {"kind": "fact", "text": "Saturno es tan liviano que flotaría en el agua. Seguime para la parte dos.", "img": "saturn planet"},
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
}
