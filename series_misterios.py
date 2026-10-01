"""Guiones de la serie 'Misterios en 60 Segundos' (canal 3).

Cada episodio es UN misterio real narrado: gancho de intriga en 2 frases ->
momentos del relato (cada uno con sus imágenes) -> remate con CTA.
Números SIEMPRE en palabras en texto hablado (dígitos solo en 'titulo').
100-165 palabras. Casos reales y verificables; leyendas narradas como leyendas.
"""

from series_data import BACKGROUNDS

KEYWORDS = [
    "shorts", "misterios", "casos sin resolver", "misterio real", "enigmas",
    "misterios en 60 segundos", "casos inexplicables", "historia misteriosa",
    "misterios del mundo", "casos reales", "viral",
]


def title_for(part: int) -> str:
    """Título propio por episodio (mejor búsqueda que 'pt. N')."""
    return f"{MISTERIOS[part]['titulo']} | Misterios en 60 Segundos"


def descripcion(parte: int, resumen: str) -> str:
    return (
        "🕵️ Casos reales que nadie pudo explicar, contados en un minuto.\n\n"
        f"🔍 Episodio {parte}: {resumen}.\n\n"
        "💡 Seguime para un misterio nuevo cada día: los enigmas más grandes "
        "de la historia en 60 segundos.\n\n"
        "misterios, casos sin resolver, enigmas, misterio real, casos inexplicables, "
        "historia misteriosa, misterios del mundo.\n\n"
        "#shorts #misterio #casosinresolver #enigmas #misterioreal #misteriosdelmundo"
    )


def background_for(part: int) -> str:
    """Mismo set de fondos rotativos que los otros canales, desfasado dos posiciones
    para que el mismo número de episodio no repita fondo entre canales."""
    return BACKGROUNDS[(part + 1) % len(BACKGROUNDS)]


def _m(text, *imgs):
    return {"kind": "fact", "text": text, "imgs": list(imgs)}


MISTERIOS = {
    1: {
        "titulo": "El Mary Celeste: el barco que navegaba solo",
        "resumen": ("el bergantín Mary Celeste encontrado a la deriva en mil ochocientos setenta y dos "
                    "con la tripulación desaparecida y todo intacto a bordo"),
        "segments": [
            _m("En diciembre de mil ochocientos setenta y dos, un barco navegaba solo por el Atlántico. "
               "La tripulación había desaparecido sin dejar rastro, y nadie lo pudo explicar.",
               "sailing ship atlantic ocean", "abandoned ship deck"),
            _m("El Mary Celeste había partido de Nueva York diez días antes. A bordo: el capitán Briggs, "
               "su esposa, su hija de dos años y siete marineros. Todos desaparecieron.",
               "new york harbor 1872", "ship captain portrait"),
            _m("El barco estaba en perfectas condiciones: la comida en la mesa, la ropa guardada, "
               "los instrumentos intactos. Solo faltaba el bote salvavidas.",
               "ship cabin interior", "lifeboat davits"),
            _m("Las teorías van desde una tromba marina que asustó a la tripulación hasta vapores de "
               "alcohol que los hicieron abandonar el barco creyendo que explotaría.",
               "waterspout sea", "cargo hold ship"),
            _m("Nunca se encontró a ninguno de los diez. El Mary Celeste siguió navegando durante años "
               "con otros dueños, como si nada hubiera pasado. Seguime para más misterios así.",
               "ghost ship fog", "ocean horizon"),
        ],
    },
    2: {
        "titulo": "La señal Wow!: el mensaje del espacio que nunca se repitió",
        "resumen": ("la señal de radiofrecuencia detectada en mil novecientos setenta y siete "
                    "que duró setenta y dos segundos y jamás volvió a registrarse"),
        "segments": [
            _m("El quince de agosto de mil novecientos setenta y siete, un telescopio recibió una señal "
               "del espacio tan intensa que el astrónomo escribió 'Wow!' al margen del papel. "
               "Nunca más se repitió.",
               "radio telescope dish", "space stars"),
            _m("El doctor Jerry Ehman trabajaba en el observatorio Big Ear de Ohio. Al revisar los datos "
               "impresos, vio un pico de señal que duraba exactamente setenta y dos segundos.",
               "ohio state university observatory", "computer printout 1977"),
            _m("La señal llegaba desde la constelación de Sagitario, en la frecuencia del hidrógeno: "
               "la misma que los astrónomos sugerían para comunicarse con civilizaciones extraterrestres.",
               "sagittarius constellation", "hydrogen frequency spectrum"),
            _m("Desde entonces se buscó la señal decenas de veces, con los mejores telescopios del mundo. "
               "Nada. En dos mil dieciséis, una señal similar llegó de una estrella cercana, "
               "pero tampoco se pudo confirmar su origen.",
               "radio telescope array", "deep space exploration"),
            _m("No hay prueba de que sea extraterrestre, pero tampoco hay explicación natural que convenza "
               "a todos. La señal Wow! sigue siendo el candidato más serio al primer contacto. "
               "Seguime para más misterios así.",
               "alien signal illustration", "telescope night sky"),
        ],
    },
    3: {
        "titulo": "El paso Dyatlov: nueve excursionistas, ninguna respuesta",
        "resumen": ("la muerte de nueve excursionistas soviéticos en los Urales en mil novecientos "
                    "cincuenta y nueve, cuya causa exacta tardó décadas en esclarecerse"),
        "segments": [
            _m("En febrero de mil novecientos cincuenta y nueve, nueve excursionistas soviéticos "
               "abandonaron su carpa en plena noche, con cuarenta grados bajo cero, sin abrigos ni botas. "
               "Ninguno sobrevivió.",
               "ural mountains winter", "soviet expedition 1950s"),
            _m("El grupo era experimentado: estudiantes universitarios liderados por Igor Dyatlov. "
               "Habían cruzado el paso sin problemas, pero algo los sacó de la carpa de golpe.",
               "hiking group snow", "mountain base camp"),
            _m("Los rescatistas encontraron la carpa cortada desde adentro. Algunos cuerpos tenían "
               "fracturas graves sin marcas externas de golpe; otros presentaban quemaduras extrañas. "
               "La escena no tenía lógica.",
               "rescue team snow search", "snow tent damage"),
            _m("Durante décadas circularon teorías: desde pruebas militares secretas hasta infrasónidos "
               "que causaron pánico. En dos mil diecinueve, investigadores rusos concluyeron que "
               "lo más probable fue una avalancha de placa, un tipo raro que lanza nieve en bloque.",
               "snow avalanche mountain", "scientific investigation"),
            _m("La hipótesis de la avalancha explica las fracturas y la huida desesperada, aunque no "
               "todos los detalles. Es el accidente de montaña más investigado de la historia. "
               "Seguime para más misterios así.",
               "mountain snow danger", "memorial stone expedition"),
        ],
    },
    4: {
        "titulo": "D.B. Cooper: el único secuestro aéreo sin resolver de EE.UU.",
        "resumen": ("el hombre que en mil novecientos setenta y uno secuestró un avión, recibió "
                    "doscientos mil dólares en rescate, saltó en paracaídas y jamás fue identificado"),
        "segments": [
            _m("El veinticuatro de noviembre de mil novecientos setenta y uno, un hombre compró "
               "un pasaje de avión, secuestró el vuelo, negoció un rescate y saltó al vacío "
               "sobre el noroeste americano. Nunca lo encontraron.",
               "boeing 727 airplane", "pacific northwest forest"),
            _m("El hombre se presentó como Dan Cooper. Entregó una nota a la azafata: decía tener "
               "una bomba y exigía doscientos mil dólares y paracaídas. Las autoridades cedieron.",
               "airplane cabin 1970s", "ransom money cash"),
            _m("Dejó bajar a los pasajeros en Seattle, luego ordenó volar hacia México. En algún punto "
               "sobre Oregon, abrió la puerta trasera del avión y saltó a ciento ochenta "
               "kilómetros por hora, en plena noche y bajo la lluvia.",
               "airplane door open sky", "parachute jump night"),
            _m("El FBI investigó el caso durante cuarenta y cinco años. En mil novecientos ochenta, "
               "un niño encontró parte del dinero en un río; el resto nunca apareció. Tampoco el cuerpo.",
               "fbi investigation files", "river bank money found"),
            _m("En dos mil dieciséis, el FBI archivó el caso. Nadie sabe si Cooper sobrevivió el salto. "
               "Es el único secuestro aéreo sin resolver de la historia de Estados Unidos. "
               "Seguime para más misterios así.",
               "wanted poster vintage", "cold case files"),
        ],
    },
    5: {
        "titulo": "El manuscrito Voynich: el libro que nadie puede leer",
        "resumen": ("el manuscrito ilustrado del siglo quince escrito en un idioma o código "
                    "que ningún criptógrafo ni lingüista pudo descifrar en cien años de intentos"),
        "segments": [
            _m("Existe un libro de doscientas cuarenta páginas que nadie puede leer. "
               "Tiene plantas que no existen en la naturaleza, mapas estelares extraños "
               "y un idioma que ningún experto pudo descifrar.",
               "ancient manuscript book", "mysterious writing symbols"),
            _m("El manuscrito Voynich data del siglo quince, probablemente del norte de Italia. "
               "Lo vendió un librero polaco en mil novecientos doce, pero su historia anterior "
               "es casi un misterio en sí misma.",
               "medieval italy manuscript", "old book parchment"),
            _m("Los mejores criptógrafos del mundo lo estudiaron durante el siglo veinte, "
               "incluidos expertos que habían descifrado códigos nazis. Ninguno lo logró.",
               "cryptography tools", "code breaking wartime"),
            _m("Las teorías son muy variadas: un idioma inventado, una lengua perdida, "
               "un código muy sofisticado, o incluso un fraude elaborado. "
               "Los análisis estadísticos muestran que el texto tiene estructura lingüística real.",
               "linguistic analysis charts", "medieval scholar"),
            _m("Hoy está en la biblioteca de la Universidad de Yale. En dos mil diecinueve, "
               "un investigador afirmó haberlo descifrado como proto-romance, "
               "pero la comunidad académica no lo aceptó. Seguime para más misterios así.",
               "yale university library", "ancient language tablet"),
        ],
    },
    6: {
        "titulo": "El hombre de Somerton: Tamam Shud",
        "resumen": ("el cadáver sin identificar encontrado en una playa de Australia en mil "
                    "novecientos cuarenta y ocho con un fragmento de papel que decía 'tamam shud'"),
        "segments": [
            _m("En diciembre de mil novecientos cuarenta y ocho, aparecieron en una playa de "
               "Adelaida los restos de un hombre bien vestido y sin identificación. "
               "En un bolsillo oculto había un pequeño trozo de papel.",
               "australia beach 1948", "mystery man suit"),
            _m("El papel decía 'Tamam Shud': palabras del poeta persa Omar Khayyam que significan "
               "'está terminado'. Provenían de una edición rarísima del Rubaiyat, "
               "hallada en un auto cercano.",
               "rubaiyat book persian poetry", "torn paper clue"),
            _m("En la contratapa había un número de teléfono y un código de cinco líneas "
               "que nadie pudo descifrar. El hombre no tenía papeles, "
               "las etiquetas de su ropa habían sido cortadas y sus huellas no coincidían con nadie.",
               "code cipher notebook", "detective investigation"),
            _m("Los análisis forenses indicaron envenenamiento, pero no se encontró sustancia alguna. "
               "Su físico era el de un atleta. Algunos creen que era un espía de la Guerra Fría.",
               "cold war spy illustration", "forensic investigation vintage"),
            _m("En dos mil veintidós, un análisis de ADN dio pistas de sus ancestros, "
               "pero su identidad sigue sin confirmarse. Es uno de los casos forenses "
               "más intrigantes del siglo veinte. Seguime para más misterios así.",
               "dna forensic lab", "cold case evidence"),
        ],
    },
    7: {
        "titulo": "El faro de Eilean Mor: tres fareros y ninguna respuesta",
        "resumen": ("la desaparición de los tres guardianes del faro de Eilean Mor en Escocia "
                    "en diciembre de mil novecientos, sin señales de lucha ni explicación lógica"),
        "segments": [
            _m("En diciembre de mil novecientos, un barco de suministros llegó a un faro escocés "
               "en una isla remota. Los tres fareros habían desaparecido. "
               "La lámpara estaba apagada y la comida, intacta sobre la mesa.",
               "scottish lighthouse island", "remote island scotland"),
            _m("El faro de Eilean Mor, en las islas Hébridas, era atendido por James Ducat, "
               "Thomas Marshall y Donald MacArthur. Eran hombres experimentados, "
               "acostumbrados a los temporales atlánticos.",
               "lighthouse keeper portrait", "hebrides islands"),
            _m("El diario del faro registraba entradas angustiantes: vientos como nunca vistos, "
               "uno de los hombres llorando. Pero el tiempo en la zona había sido tranquilo "
               "según otros registros cercanos.",
               "lighthouse logbook journal", "stormy atlantic sea"),
            _m("La silla del comedor estaba volcada, pero no había señales de lucha. "
               "Las chaquetas de los fareros colgaban en sus ganchos. "
               "Nunca se encontraron los cuerpos.",
               "lighthouse interior room", "overturned chair"),
            _m("Las teorías apuntan a una ola gigante que los sorprendió en los acantilados, "
               "pero nadie pudo probar nada. La desaparición de los tres guardianes de Eilean Mor "
               "sigue sin explicación oficial. Seguime para más misterios así.",
               "lighthouse cliff waves", "memorial plaque stone"),
        ],
    },
    8: {
        "titulo": "Kryptos: la escultura de la CIA que sigue sin descifrar del todo",
        "resumen": ("la escultura de Jim Sanborn instalada en la sede de la CIA en mil novecientos "
                    "noventa con cuatro mensajes cifrados, tres descifrados y uno que resiste todo intento"),
        "segments": [
            _m("En el patio de la CIA hay una escultura con un mensaje cifrado desde mil novecientos "
               "noventa. Tres de sus cuatro partes fueron descifradas. "
               "La cuarta lleva más de treinta años resistiendo a los mejores criptógrafos del mundo.",
               "cia headquarters langley", "sculpture art outdoor"),
            _m("Kryptos fue diseñada por Jim Sanborn. Es una placa de cobre con "
               "ochocientos sesenta y cinco caracteres organizados en cuatro mensajes cifrados.",
               "copper sculpture art", "abstract metal art"),
            _m("Las tres primeras partes contienen textos sobre excavaciones y coordenadas geográficas, "
               "incluyendo una referencia a Howard Carter abriendo la tumba de Tutankamón. "
               "Fueron descifradas en mil novecientos noventa y nueve.",
               "tutankhamun tomb egypt", "archaeologist excavation"),
            _m("La cuarta parte tiene apenas noventa y siete caracteres. "
               "Sanborn dio una pista en dos mil diez: ciertas letras significan 'BERLIN'. "
               "En dos mil veinte agregó otra: 'CLOCK'.",
               "cipher code symbols", "cryptography puzzle"),
            _m("Ni la CIA ni los mejores criptógrafos lo resolvieron. "
               "Sanborn dijo que probablemente no lo descifren hasta después de su muerte. "
               "Seguime para más misterios así.",
               "secret code mystery", "cia seal emblem"),
        ],
    },
    9: {
        "titulo": "La lluvia de carne de Kentucky",
        "resumen": ("el extraño fenómeno de marzo de mil ochocientos setenta y seis cuando trozos "
                    "de carne fresca cayeron del cielo despejado sobre un campo de Kentucky"),
        "segments": [
            _m("El nueve de marzo de mil ochocientos setenta y seis, trozos de carne fresca "
               "cayeron del cielo sobre un campo de Kentucky. "
               "El cielo estaba despejado. No había nubes. Nadie entendió nada.",
               "kentucky countryside 1870s", "clear blue sky"),
            _m("La lluvia duró unos dos minutos y cubrió una franja de unos cien metros de largo "
               "por unos once de ancho. Los trozos eran de distintos tamaños, "
               "algunos tan grandes como una mano.",
               "meat pieces ground", "rural farm field"),
            _m("Científicos que analizaron muestras identificaron tejido muscular, cartílago y hueso "
               "de al menos tres animales diferentes: ovejas, caballos y osos americanos.",
               "scientific analysis lab", "biological specimens"),
            _m("La explicación más aceptada involucra buitres americanos. "
               "Estas aves, cuando se asustan al volar en grupo, vomitan para aligerar el vuelo. "
               "Un banco de buitres en vuelo pudo haber causado la lluvia.",
               "turkey vultures flying", "vulture flock sky"),
            _m("El suceso fue documentado en revistas científicas de la época y sigue siendo "
               "uno de los fenómenos más raros registrados en la historia de Estados Unidos. "
               "Seguime para más misterios así.",
               "scientific journal 1876", "strange phenomenon sky"),
        ],
    },
    10: {
        "titulo": "El MV Joyita: el barco fantasma del Pacífico",
        "resumen": ("el barco de pesca encontrado a la deriva en el Pacífico Sur en mil novecientos "
                    "cincuenta y cinco con sus veinticinco tripulantes desaparecidos y lleno de vendas"),
        "segments": [
            _m("En octubre de mil novecientos cincuenta y cinco, un avión descubrió un barco "
               "a la deriva en el Pacífico Sur con vendas médicas y equipo intacto, "
               "pero las veinticinco personas que partieron habían desaparecido.",
               "pacific ocean aerial view", "abandoned boat sea"),
            _m("El MV Joyita había salido de Samoa rumbo a las islas Tokelau, un viaje de dos días. "
               "Lo encontraron cinco semanas después, a ochocientos kilómetros de su ruta.",
               "samoa islands pacific", "fishing vessel 1950s"),
            _m("El barco estaba parcialmente inundado pero no se hundía: el corcho de aislamiento "
               "lo mantenía a flote. El motor estaba averiado y la radio no funcionaba bien.",
               "ship engine room", "broken radio equipment"),
            _m("Las vendas ensangrentadas sugerían heridos a bordo. "
               "El capitán Thomas Miller padecía una fístula y posiblemente colapsó, "
               "lo que pudo desencadenar el abandono del barco.",
               "ship medical supplies", "captain at helm"),
            _m("Nunca se encontró a ninguno de los veinticinco. La teoría del abandono en botes "
               "que se perdieron en mar abierto es la más aceptada, "
               "pero ningún cuerpo apareció. Seguime para más misterios así.",
               "lifeboat empty ocean", "pacific islands horizon"),
        ],
    },
}

PARTS = MISTERIOS
