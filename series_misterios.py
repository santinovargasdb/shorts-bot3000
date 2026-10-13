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
        "pregunta": "¿Tromba marina o pánico a bordo?",
        "titulo": "El Mary Celeste: el barco que navegaba solo",
        "resumen": ("el bergantín Mary Celeste encontrado a la deriva en mil ochocientos setenta y dos "
                    "con la tripulación desaparecida y todo intacto a bordo"),
        "segments": [
            _m("Un barco navegaba solo por el Atlántico, sin un alma al timón. "
               "Las diez personas a bordo habían desaparecido sin dejar rastro, y nadie lo pudo explicar.",
               "sailing ship atlantic ocean", "abandoned ship deck"),
            _m("El Mary Celeste había zarpado de Nueva York en noviembre de mil ochocientos setenta y dos. "
               "La última entrada del diario de a bordo era de diez días antes del hallazgo. "
               "A bordo: el capitán Briggs, su esposa, su hija de dos años y siete marineros.",
               "new york harbor 1872", "ship captain portrait"),
            _m("La carga y las pertenencias estaban intactas. Había un metro de agua en la bodega "
               "y el bote salvavidas no estaba. La leyenda popular añadió después la imagen "
               "de comida servida en la mesa, pero eso no consta en el informe oficial.",
               "ship cabin interior", "lifeboat davits"),
            _m("Las teorías van desde una tromba marina que asustó a la tripulación hasta vapores de "
               "alcohol que los hicieron abandonar el barco creyendo que explotaría.",
               "waterspout sea", "cargo hold ship"),
            _m("Nunca se encontró a ninguno de los diez. El Mary Celeste siguió navegando durante años "
               "con otros dueños, como si nada hubiera pasado.",
               "ghost ship fog", "ocean horizon"),
        ],
    },
    2: {
        "pregunta": "¿Interferencia o primer contacto?",
        "titulo": "La señal Wow!: el mensaje del espacio que nunca se repitió",
        "resumen": ("la señal de radiofrecuencia detectada en mil novecientos setenta y siete "
                    "que duró setenta y dos segundos y jamás volvió a registrarse"),
        "segments": [
            _m("Un telescopio recibió una señal del espacio tan intensa que el astrónomo "
               "escribió 'Wow!' al margen del papel. Duró setenta y dos segundos. "
               "Nunca más se repitió.",
               "radio telescope dish", "space stars"),
            _m("Fue la noche del quince de agosto de mil novecientos setenta y siete. El doctor Jerry Ehman "
               "revisaba los datos impresos del observatorio Big Ear de Ohio cuando encontró el pico de señal.",
               "ohio state university observatory", "computer printout 1977"),
            _m("La señal llegaba desde la constelación de Sagitario, en la frecuencia del hidrógeno: "
               "la misma que los astrónomos sugerían para comunicarse con civilizaciones extraterrestres.",
               "sagittarius constellation", "hydrogen frequency spectrum"),
            _m("Desde entonces se buscó la señal decenas de veces, con los mejores telescopios del mundo. "
               "Nada. En dos mil dieciséis se detectó una señal parecida desde una estrella de la "
               "constelación de Hércules, pero luego se atribuyó a interferencia terrestre.",
               "radio telescope array", "deep space exploration"),
            _m("No hay prueba de que sea extraterrestre, pero tampoco hay explicación natural que convenza "
               "a todos. La señal Wow! sigue siendo el candidato más serio al primer contacto. "
               "",
               "alien signal illustration", "telescope night sky"),
        ],
    },
    3: {
        "pregunta": "¿Avalancha o algo más?",
        "titulo": "El paso Dyatlov: nueve excursionistas, ninguna respuesta",
        "resumen": ("la muerte de nueve excursionistas soviéticos en los Urales en mil novecientos "
                    "cincuenta y nueve, cuya causa exacta tardó décadas en esclarecerse"),
        "segments": [
            _m("Nueve excursionistas abandonaron su carpa en plena noche, a veinticinco grados "
               "bajo cero, sin abrigos ni botas. Ninguno sobrevivió.",
               "ural mountains winter", "soviet expedition 1950s"),
            _m("Fue en febrero de mil novecientos cincuenta y nueve, en los Urales soviéticos. "
               "El grupo era experimentado: estudiantes universitarios liderados por Igor Dyatlov. "
               "Acamparon en la ladera del monte Kholat Syakhl tras desviarse por mala visibilidad, "
               "pero algo los sacó de la carpa de golpe.",
               "hiking group snow", "mountain base camp"),
            _m("Los rescatistas encontraron la carpa cortada desde adentro. Algunos cuerpos tenían "
               "fracturas graves sin marcas externas de golpe; otros presentaban quemaduras extrañas. "
               "La escena no tenía lógica.",
               "rescue team snow search", "snow tent damage"),
            _m("Durante décadas circularon teorías: desde pruebas militares secretas hasta infrasónidos "
               "que causaron pánico. En dos mil diecinueve reabrieron el caso y en dos mil veinte "
               "concluyeron que lo más probable fue una avalancha de placa, un tipo raro que lanza nieve en bloque.",
               "snow avalanche mountain", "scientific investigation"),
            _m("La hipótesis de la avalancha explica las fracturas y la huida desesperada, aunque no "
               "todos los detalles. Es el accidente de montaña más investigado de la historia. "
               "",
               "mountain snow danger", "memorial stone expedition"),
        ],
    },
    4: {
        "pregunta": "¿Sobrevivió al salto o no?",
        "titulo": "D.B. Cooper: el único secuestro aéreo sin resolver de EE.UU.",
        "resumen": ("el hombre que en mil novecientos setenta y uno secuestró un avión, recibió "
                    "doscientos mil dólares en rescate, saltó en paracaídas y jamás fue identificado"),
        "segments": [
            _m("Un hombre secuestró un avión, cobró el rescate y saltó al vacío "
               "con el dinero encima. Nunca lo encontraron.",
               "boeing 727 airplane", "pacific northwest forest"),
            _m("Fue el veinticuatro de noviembre de mil novecientos setenta y uno. Se presentó como "
               "Dan Cooper y entregó una nota a la azafata: decía tener una bomba y exigía "
               "doscientos mil dólares y paracaídas. Las autoridades cedieron.",
               "airplane cabin 1970s", "ransom money cash"),
            _m("Dejó bajar a los pasajeros en Seattle y ordenó volar hacia México. En algún punto "
               "sobre Washington, abrió la puerta trasera del avión y saltó a ciento ochenta "
               "kilómetros por hora, en plena noche y bajo la lluvia.",
               "airplane door open sky", "parachute jump night"),
            _m("El FBI investigó el caso durante cuarenta y cinco años. En mil novecientos ochenta, "
               "un niño encontró parte del dinero en un río; el resto nunca apareció. Tampoco el cuerpo.",
               "fbi investigation files", "river bank money found"),
            _m("En dos mil dieciséis, el FBI archivó el caso. Nadie sabe si Cooper sobrevivió el salto. "
               "Es el único secuestro aéreo sin resolver de la historia de Estados Unidos. "
               "",
               "wanted poster vintage", "cold case files"),
        ],
    },
    5: {
        "pregunta": "¿Idioma perdido o fraude genial?",
        "titulo": "El manuscrito Voynich: el libro que nadie puede leer",
        "resumen": ("el manuscrito ilustrado del siglo quince escrito en un idioma o código "
                    "que ningún criptógrafo ni lingüista pudo descifrar en cien años de intentos"),
        "segments": [
            _m("Existe un libro de doscientas cuarenta páginas que nadie puede leer. "
               "Tiene plantas que no existen en la naturaleza, mapas estelares extraños "
               "y un idioma que ningún experto pudo descifrar.",
               "ancient manuscript book", "mysterious writing symbols"),
            _m("El manuscrito Voynich data del siglo quince, probablemente del norte de Italia. "
               "Lo compró el librero polaco Wilfrid Voynich en mil novecientos doce, pero su historia anterior "
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
               "pero la comunidad académica no lo aceptó.",
               "yale university library", "ancient language tablet"),
        ],
    },
    6: {
        "pregunta": "¿Espía o suicidio?",
        "titulo": "El hombre de Somerton: Tamam Shud",
        "resumen": ("el cadáver sin identificar encontrado en una playa de Australia en mil "
                    "novecientos cuarenta y ocho con un fragmento de papel que decía 'tamam shud'"),
        "segments": [
            _m("Apareció muerto en una playa de Australia: traje impecable, ninguna identificación. "
               "En un bolsillo oculto había un pequeño trozo de papel.",
               "australia beach 1948", "mystery man suit"),
            _m("Fue en diciembre de mil novecientos cuarenta y ocho, en Adelaida. El papel decía "
               "'Tamam Shud': palabras del poeta persa Omar Khayyam que significan 'está terminado'. "
               "Provenían de una edición rarísima del Rubaiyat, hallada en un auto cercano.",
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
               "más intrigantes del siglo veinte.",
               "dna forensic lab", "cold case evidence"),
        ],
    },
    7: {
        "pregunta": "¿Ola gigante o algo más?",
        "titulo": "El faro de Eilean Mor: tres fareros y ninguna respuesta",
        "resumen": ("la desaparición de los tres guardianes del faro de Eilean Mor en Escocia "
                    "en diciembre de mil novecientos, sin señales de lucha ni explicación lógica"),
        "segments": [
            _m("Un barco de suministros llegó a un faro en una isla remota de Escocia. "
               "Los tres fareros habían desaparecido. "
               "La lámpara llevaba once días apagada.",
               "scottish lighthouse island", "remote island scotland"),
            _m("Era diciembre de mil novecientos. El faro de Eilean Mor, en las islas Hébridas, "
               "era atendido por James Ducat, Thomas Marshall y Donald MacArthur: hombres "
               "experimentados, acostumbrados a los temporales atlánticos.",
               "lighthouse keeper portrait", "hebrides islands"),
            _m("Según el informe oficial de Muirhead, la cocina estaba ordenada y el reloj parado. "
               "Faltaban dos juegos de impermeables; el abrigo de MacArthur quedó colgado. "
               "Esa pista real sugiere que salió desabrigado a la tormenta.",
               "lighthouse logbook journal", "stormy atlantic sea"),
            _m("La imagen de la silla volcada y el diario con entradas aterradoras viene del poema "
               "'Flannan Isle' de mil novecientos doce y de la prensa sensacionalista: "
               "son leyenda, no el informe oficial. Nunca se encontraron los cuerpos.",
               "lighthouse interior room", "overturned chair"),
            _m("La hipótesis aceptada: una ola gigante los sorprendió en la plataforma oeste "
               "mientras aseguraban equipos. Los tres guardianes de Eilean Mor "
               "siguen siendo uno de los misterios marítimos más célebres.",
               "lighthouse cliff waves", "memorial plaque stone"),
        ],
    },
    8: {
        "pregunta": "¿Lo descifran o muere con su autor?",
        "titulo": "Kryptos: la escultura de la CIA que sigue sin descifrar del todo",
        "resumen": ("la escultura de Jim Sanborn instalada en la sede de la CIA en mil novecientos "
                    "noventa con cuatro mensajes cifrados, tres descifrados y uno que resiste todo intento"),
        "segments": [
            _m("Hay una escultura en el patio de la CIA con un mensaje cifrado a la vista de todos. "
               "Tres de sus cuatro partes fueron descifradas. "
               "La cuarta lleva más de treinta años resistiendo a los mejores criptógrafos del mundo.",
               "cia headquarters langley", "sculpture art outdoor"),
            _m("Kryptos fue instalada en mil novecientos noventa por el artista Jim Sanborn. "
               "Es una placa de cobre con ochocientos sesenta y cinco caracteres "
               "organizados en cuatro mensajes cifrados.",
               "copper sculpture art", "abstract metal art"),
            _m("Las tres primeras partes contienen textos sobre excavaciones y coordenadas geográficas, "
               "incluyendo una referencia a Howard Carter abriendo la tumba de Tutankamón. "
               "Fueron descifradas en mil novecientos noventa y nueve.",
               "tutankhamun tomb egypt", "archaeologist excavation"),
            _m("La cuarta parte tiene apenas noventa y siete caracteres. "
               "Sanborn dio una pista en dos mil diez: ciertas letras significan 'BERLIN'. "
               "En dos mil catorce agregó 'CLOCK' y en dos mil veinte reveló 'NORTHEAST'.",
               "cipher code symbols", "cryptography puzzle"),
            _m("Ni la CIA ni los mejores criptógrafos lo resolvieron. "
               "Sanborn dijo que probablemente no lo descifren hasta después de su muerte. "
               "",
               "secret code mystery", "cia seal emblem"),
        ],
    },
    9: {
        "pregunta": "¿Buitres o algo que no sabemos?",
        "titulo": "La lluvia de carne de Kentucky",
        "resumen": ("el extraño fenómeno de marzo de mil ochocientos setenta y seis cuando trozos "
                    "de carne fresca cayeron del cielo despejado sobre un campo de Kentucky"),
        "segments": [
            _m("Trozos de carne fresca cayeron del cielo sobre un campo de Kentucky. "
               "El cielo estaba despejado. No había nubes. Nadie entendió nada.",
               "kentucky countryside 1870s", "clear blue sky"),
            _m("Fue el tres de marzo de mil ochocientos setenta y seis. "
               "La lluvia duró unos dos minutos y cubrió una franja de unos cien metros de largo "
               "por unos cincuenta de ancho. Los trozos eran de distintos tamaños, "
               "algunos tan grandes como una mano.",
               "meat pieces ground", "rural farm field"),
            _m("Científicos que analizaron muestras identificaron tejido pulmonar, músculo y cartílago. "
               "Dos vecinos la probaron y dijeron que sabía a carnero o venado. "
               "No se hallaron huesos ni rastros de oso.",
               "scientific analysis lab", "biological specimens"),
            _m("La explicación más aceptada involucra buitres americanos. "
               "Estas aves, cuando se asustan al volar en grupo, vomitan para aligerar el vuelo. "
               "Un banco de buitres en vuelo pudo haber causado la lluvia.",
               "turkey vultures flying", "vulture flock sky"),
            _m("El suceso fue documentado en revistas científicas de la época y sigue siendo "
               "uno de los fenómenos más raros registrados en la historia de Estados Unidos. "
               "",
               "scientific journal 1876", "strange phenomenon sky"),
        ],
    },
    10: {
        "pregunta": "¿Motín, accidente o abandono?",
        "titulo": "El MV Joyita: el barco fantasma del Pacífico",
        "resumen": ("el barco de pesca encontrado a la deriva en el Pacífico Sur en mil novecientos "
                    "cincuenta y cinco con sus veinticinco tripulantes desaparecidos y lleno de vendas"),
        "segments": [
            _m("Veinticinco personas desaparecieron de un barco en el Pacífico Sur. "
               "La búsqueda aérea no encontró nada. "
               "Cinco semanas después, el barco apareció solo, a la deriva.",
               "pacific ocean aerial view", "abandoned boat sea"),
            _m("El MV Joyita había salido de Samoa en octubre de mil novecientos cincuenta y cinco "
               "rumbo a las islas Tokelau, un viaje de dos días. Lo encontraron a casi mil "
               "kilómetros de su ruta, con vendas médicas y equipo intacto.",
               "samoa islands pacific", "fishing vessel 1950s"),
            _m("El barco estaba parcialmente inundado pero no se hundía: el corcho de aislamiento "
               "lo mantenía a flote. El motor estaba averiado y la radio no funcionaba bien.",
               "ship engine room", "broken radio equipment"),
            _m("Las vendas ensangrentadas sugerían heridos a bordo. "
               "El capitán Thomas Miller estaba enfermo y pudo haber colapsado, "
               "lo que habría desencadenado el abandono del barco.",
               "ship medical supplies", "captain at helm"),
            _m("Nunca se encontró a ninguno de los veinticinco. La teoría del abandono en botes "
               "que se perdieron en mar abierto es la más aceptada, "
               "pero ningún cuerpo apareció.",
               "lifeboat empty ocean", "pacific islands horizon"),
        ],
    },
    11: {
        "pregunta": "¿Quién vivía en el ático?",
        "titulo": "Hinterkaifeck: los asesinatos que nadie resolvió",
        "resumen": ("la masacre de la granja Hinterkaifeck en Baviera en mil novecientos veintidós, "
                    "con huellas en la nieve que iban hacia la casa pero no volvían"),
        "segments": [
            _m("Toda una familia apareció asesinada en su granja. Lo más escalofriante: alguien había estado viviendo con ellos en la casa, sin que lo supieran, los días anteriores.",
               "old bavarian farm", "snowy farmhouse night"),
            _m("Pasó en la granja Hinterkaifeck, en Baviera, en mil novecientos veintidós. Días antes, el dueño contó que había visto huellas en la nieve que iban hacia la casa, pero ninguna que volviera.",
               "footprints in snow", "german countryside 1920s"),
            _m("También escuchó pasos en el ático y encontró un diario que no era de nadie de la casa. La criada anterior había renunciado diciendo que el lugar estaba embrujado.",
               "wooden attic", "old german newspaper"),
            _m("Una noche, los seis habitantes fueron asesinados a golpes con una herramienta de labranza. El asesino se quedó varios días en la granja: alimentó a los animales y comió en la cocina.",
               "barn farm animals", "old farmhouse kitchen"),
            _m("Los vecinos vieron humo en la chimenea después de las muertes. Casi cien años y más de cien sospechosos después, el caso sigue sin resolverse.",
               "chimney smoke house", "cold case file"),
        ],
    },
    12: {
        "pregunta": "¿Experimento o encuentro?",
        "titulo": "El caso de las máscaras de plomo",
        "resumen": ("los dos técnicos brasileños hallados muertos en mil novecientos sesenta y seis "
                    "en una colina de Niterói con máscaras de plomo y una nota críptica"),
        "segments": [
            _m("Encontraron a dos hombres muertos en lo alto de una colina, con máscaras de plomo tapándoles los ojos y una nota con instrucciones extrañas al lado.",
               "brazil hill vegetation", "lead mask mystery"),
            _m("Fue en Niterói, Brasil, en mil novecientos sesenta y seis. Los dos eran técnicos en electrónica y habían salido de su casa diciendo que iban a comprar materiales.",
               "niteroi brazil hill", "vintage electronics technician"),
            _m("La nota decía: a las cuatro y media estar en el lugar señalado; a las seis y media, tragar las cápsulas y esperar la señal con las máscaras puestas.",
               "cryptic handwritten note", "pills capsules"),
            _m("No había signos de violencia ni veneno detectable con las técnicas de la época. Las máscaras de plomo suelen usarse para protegerse de radiación o de una luz muy intensa.",
               "vintage autopsy report", "lead radiation shield"),
            _m("¿Qué señal esperaban? ¿Un experimento, un contacto, una secta? Nunca se supo. El caso de las máscaras de plomo sigue abierto.",
               "mysterious light sky", "unsolved case brazil"),
        ],
    },
    13: {
        "pregunta": "¿Broma o algo más?",
        "titulo": "El pirata de TV que nadie pudo identificar",
        "resumen": ("el secuestro de la señal de televisión en Chicago en mil novecientos ochenta y siete "
                    "por alguien con una máscara de Max Headroom, jamás identificado"),
        "segments": [
            _m("Alguien secuestró la señal de televisión de una ciudad entera. Durante poco más de un minuto apareció un personaje enmascarado, y hasta hoy nadie sabe quién fue.",
               "old tv static", "retro television set"),
            _m("Pasó en Chicago, una noche de noviembre de mil novecientos ochenta y siete. En plena transmisión, la imagen se cortó y apareció un hombre con una máscara de Max Headroom, un personaje de moda.",
               "chicago skyline night", "glitch tv screen"),
            _m("La señal pirata casi no tenía sonido claro: el hombre se reía, hacía gestos raros y decía frases sin sentido. Duró unos segundos y volvió la programación normal.",
               "tv interference glitch", "80s broadcast studio"),
            _m("Esa misma noche interrumpió otro canal, esta vez por más de un minuto, con una escena todavía más perturbadora. Hacer esto requería equipos caros y conocimiento técnico.",
               "broadcast tower antenna", "tv transmitter equipment"),
            _m("La justicia y la comisión de comunicaciones investigaron, pero nunca atraparon a nadie. Es uno de los poquísimos secuestros de señal de la historia que quedó sin resolver.",
               "fcc investigation vintage", "unsolved tv mystery"),
        ],
    },
    14: {
        "pregunta": "¿Leyenda o realidad?",
        "titulo": "El hombre del país que no existe",
        "resumen": ("la historia, narrada como leyenda urbana, del viajero que llegó a Japón con "
                    "pasaporte de un país llamado Taured, inexistente en todo mapa"),
        "segments": [
            _m("Un hombre llegó a un aeropuerto con el pasaporte de un país que no figura en ningún mapa. Y, según cuenta la historia, después desapareció de una habitación vigilada.",
               "vintage airport customs", "mysterious passport"),
            _m("La leyenda la ubica en un aeropuerto de Tokio. El hombre decía venir de Taured, un país que, aseguraba, existía desde hacía siglos en Europa. En el mapa, en ese lugar, estaba Andorra.",
               "vintage tokyo airport", "europe world map"),
            _m("Tenía documentos, dinero de varios países y sellos de viajes anteriores a Japón, todos aparentemente en regla. Insistía en que Taured era real y no entendía la confusión.",
               "foreign currency bills", "passport stamps"),
            _m("Lo alojaron en un cuarto de hotel bajo vigilancia mientras investigaban. A la mañana siguiente, el hombre y todos sus documentos habían desaparecido sin dejar rastro.",
               "hotel room door", "empty hotel room"),
            _m("Importante: no hay registros oficiales que lo confirmen y se considera una leyenda urbana que creció con los años. Pero sigue siendo uno de los relatos más inquietantes entre viajeros.",
               "urban legend book", "empty airport night"),
        ],
    },
    15: {
        "pregunta": "¿Meteoro o misterio?",
        "titulo": "La explosión que arrasó un bosque sin dejar cráter",
        "resumen": ("el evento de Tunguska de mil novecientos ocho, una explosión descomunal sobre "
                    "Siberia que derribó millones de árboles sin dejar cráter de impacto"),
        "segments": [
            _m("Algo estalló sobre Siberia con la fuerza de cientos de bombas atómicas y aplastó un bosque enorme. No quedó cráter ni rastro de qué fue.",
               "flattened forest siberia", "explosion in sky"),
            _m("Fue la mañana del treinta de junio de mil novecientos ocho, en una zona remota cerca del río Tunguska. La onda derribó unos ochenta millones de árboles en dos mil kilómetros cuadrados.",
               "siberia taiga forest", "fallen trees aerial"),
            _m("Hubo testigos a kilómetros que vieron una bola de fuego cruzar el cielo y sintieron un calor abrasador. La explosión quedó registrada en sismógrafos de todo el mundo.",
               "fireball in sky", "seismograph recording"),
            _m("Lo más raro: no había cráter de impacto. Por eso, durante décadas, se habló de todo, desde un cometa hasta teorías mucho más delirantes.",
               "siberian landscape", "missing impact crater"),
            _m("La explicación más aceptada hoy es un meteoro o cometa que estalló en el aire antes de tocar el suelo. Por eso aplastó el bosque sin dejar cráter.",
               "meteor air burst", "comet in space"),
        ],
    },
    16: {
        "pregunta": "¿Criatura gigante o hielo?",
        "titulo": "El Bloop: el sonido del océano que nadie podía explicar",
        "resumen": ("el sonido submarino ultra potente captado en mil novecientos noventa y siete, "
                    "tan fuerte que se registró a miles de kilómetros de distancia"),
        "segments": [
            _m("Unos micrófonos en el fondo del mar captaron un sonido tan potente que se escuchó "
               "a más de cinco mil kilómetros de distancia. No se parecía a nada conocido.",
               "deep ocean underwater", "sound wave spectrogram"),
            _m("Fue en mil novecientos noventa y siete. La agencia oceánica de Estados Unidos lo registró "
               "en el Pacífico Sur, con una red de micrófonos que en su origen servía para espiar submarinos.",
               "hydrophone ocean", "pacific ocean map"),
            _m("El sonido, apodado 'the Bloop', subía rápido de frecuencia y duraba poco más de un minuto. "
               "Su perfil se parecía al de un ser vivo, pero ningún animal conocido podía ser tan ruidoso.",
               "whale underwater", "ocean sound monitoring"),
            _m("Durante años se especuló con criaturas marinas gigantes todavía sin descubrir, "
               "y la idea encendió la imaginación de medio mundo.",
               "giant sea creature art", "deep sea mystery"),
            _m("En dos mil doce la misma agencia dio la respuesta: era el crujido de enormes icebergs "
               "al fracturarse cerca de la Antártida. El misterio tenía una explicación helada.",
               "antarctica icebergs", "ice crack glacier"),
        ],
    },
    17: {
        "pregunta": "¿Vecino, familiar o desconocido?",
        "titulo": "Las cartas de Circleville: el acosador anónimo de todo un pueblo",
        "resumen": ("la ola de cartas anónimas que aterrorizó al pueblo de Circleville, Ohio, "
                    "desde mil novecientos setenta y seis, revelando secretos que nadie debería saber"),
        "segments": [
            _m("Los vecinos de un pueblo empezaron a recibir cartas anónimas que conocían sus secretos "
               "más íntimos. Quien las escribía parecía vigilar cada movimiento.",
               "old mailbox rural", "anonymous letter handwriting"),
            _m("Empezó en mil novecientos setenta y seis en Circleville, Ohio. Las cartas, en mayúsculas, "
               "acusaban, amenazaban y revelaban secretos de familias enteras.",
               "ohio small town", "vintage typewriter letter"),
            _m("Un hombre que intentó descubrir al autor apareció muerto en un supuesto accidente de auto. "
               "Las cartas siguieron llegando, ahora burlándose de la investigación.",
               "country road accident", "police investigation 1970s"),
            _m("Años después condenaron a un familiar por colocar una trampa, pero él seguía recibiendo "
               "cartas estando preso, lo que complicaba toda la teoría.",
               "prison cell", "mystery letters pile"),
            _m("Las cartas pararon de golpe en los años noventa. Nunca hubo certeza total de quién estaba "
               "detrás de todo. El caso todavía genera debate.",
               "empty mailbox", "cold case file"),
        ],
    },
    18: {
        "pregunta": "¿Mensaje real o burla?",
        "titulo": "Los códigos del Zodiac: medio siglo para descifrar uno",
        "resumen": ("los mensajes cifrados que el asesino del Zodiac mandó a la prensa en los años sesenta, "
                    "uno de ellos sin descifrar hasta dos mil veinte"),
        "segments": [
            _m("Un asesino le mandó a los diarios mensajes escritos en código y prometió que revelaban "
               "su identidad. Uno de esos códigos tardó cincuenta y un años en descifrarse.",
               "newspaper 1960s crime", "cipher code symbols"),
            _m("Fue en California, a fines de los años sesenta. El llamado asesino del Zodiac enviaba cartas "
               "con símbolos a los periódicos y exigía que las publicaran.",
               "san francisco bay 1969", "coded letter symbols"),
            _m("El primer código lo resolvió una pareja de maestros en pocos días: no daba ningún nombre, "
               "solo un texto perturbador sobre matar por placer.",
               "cryptography puzzle", "handwritten cipher"),
            _m("Un segundo mensaje, de trescientos cuarenta símbolos, resistió a los mejores criptógrafos "
               "y hasta al FBI durante décadas.",
               "fbi investigation", "complex cipher grid"),
            _m("En dos mil veinte un equipo de aficionados lo descifró con software: tampoco tenía su nombre. "
               "La identidad del Zodiac sigue siendo un misterio.",
               "computer code breaking", "unsolved case file"),
        ],
    },
    19: {
        "pregunta": "¿Fenómeno físico o percepción?",
        "titulo": "El zumbido de Taos: el sonido que solo algunos escuchan",
        "resumen": ("el misterioso zumbido grave reportado en la ciudad de Taos, Nuevo México, "
                    "desde los años noventa, audible solo para una parte de la población"),
        "segments": [
            _m("Una parte de los habitantes de una ciudad escucha un zumbido grave y constante que los "
               "desespera. El resto no oye absolutamente nada.",
               "quiet town desert", "sound waves low frequency"),
            _m("El caso más famoso es el de Taos, en Nuevo México, en los años noventa. Alrededor del dos "
               "por ciento de la gente decía oír un zumbido parecido al de un motor lejano.",
               "taos new mexico", "person covering ears"),
            _m("Los que lo oían no podían dormir ni concentrarse. Un estudio con equipos sensibles no logró "
               "captar ningún sonido que explicara lo que describían.",
               "scientific sound equipment", "sleepless night bedroom"),
            _m("Se propuso de todo: desde fenómenos industriales y ondas de radio hasta una sensibilidad "
               "auditiva especial de ciertas personas.",
               "industrial equipment", "radio tower signal"),
            _m("El fenómeno se repite en otras ciudades del mundo, como Bristol. Todavía no hay una "
               "explicación aceptada por todos. El zumbido sigue ahí, para quienes lo oyen.",
               "city skyline night", "mystery sound concept"),
        ],
    },
    20: {
        "pregunta": "¿Tesoro real o estafa?",
        "titulo": "Los códigos Beale: el tesoro enterrado que nadie encontró",
        "resumen": ("los tres mensajes cifrados del siglo diecinueve que supuestamente indican dónde está "
                    "escondido un tesoro millonario en Virginia"),
        "segments": [
            _m("Tres mensajes en código prometen el lugar exacto de un tesoro enterrado que hoy valdría "
               "decenas de millones. Solo uno de los tres se pudo leer.",
               "treasure chest gold", "old cipher document"),
            _m("La historia arranca en Virginia, a principios del siglo diecinueve. Un hombre llamado "
               "Thomas Beale habría dejado los códigos antes de desaparecer para siempre.",
               "virginia countryside 1820s", "buried treasure map"),
            _m("El segundo código se descifró usando la Declaración de Independencia como clave: "
               "describe oro, plata y joyas enterrados en la zona.",
               "declaration of independence", "gold silver coins"),
            _m("Pero los otros dos, que darían la ubicación exacta y los nombres de los dueños, "
               "resisten hasta hoy pese a más de cien años de intentos.",
               "cryptography numbers", "men digging field"),
            _m("Muchos creen que todo fue una estafa inventada para vender un folleto. Otros siguen cavando. "
               "El tesoro, si existe, jamás apareció.",
               "metal detector field", "treasure hunt mystery"),
        ],
    },
    21: {
        "pregunta": "¿Escritura, oración o falsificación?",
        "titulo": "El disco de Festos: el código que lleva un siglo sin leerse",
        "resumen": ("el disco de arcilla de más de tres mil años hallado en Creta, cubierto de símbolos "
                    "impresos que nadie logró descifrar"),
        "segments": [
            _m("Un disco de arcilla está cubierto de símbolos que nadie pudo leer en más de un siglo. "
               "Y hay un detalle que lo vuelve único en todo el mundo antiguo.",
               "ancient clay disc", "mysterious symbols artifact"),
            _m("Lo encontraron en mil novecientos ocho en un palacio de la isla de Creta. Tiene unos "
               "doscientos cuarenta y un símbolos dispuestos en espiral por las dos caras.",
               "crete greece ruins", "archaeology excavation"),
            _m("Lo asombroso: los símbolos no están tallados a mano, sino impresos con sellos, "
               "como una imprenta miles de años antes de que se inventara.",
               "ancient stamp seal", "spiral inscription clay"),
            _m("Se propuso que es una oración, un poema, un calendario o hasta un juego. Pero al ser un "
               "texto tan corto y único, no hay con qué compararlo.",
               "ancient greek writing", "museum artifact display"),
            _m("Algunos expertos incluso dudan de que sea auténtico. Más de un siglo después, "
               "el disco de Festos sigue guardando su secreto.",
               "heraklion museum", "undeciphered script"),
        ],
    },
    22: {
        "pregunta": "¿Desorientación o algo más?",
        "titulo": "El piloto que desapareció describiendo algo en el cielo",
        "resumen": ("la desaparición del joven piloto australiano Frederick Valentich en mil novecientos "
                    "setenta y ocho mientras reportaba por radio un objeto extraño"),
        "segments": [
            _m("Un piloto joven desapareció con su avión mientras le describía por radio a la torre "
               "algo que, decía, volaba justo encima de él.",
               "small plane cockpit", "night sky clouds"),
            _m("Fue en octubre de mil novecientos setenta y ocho, sobre el estrecho de Bass, en Australia. "
               "Frederick Valentich, de veinte años, hacía un vuelo de rutina.",
               "bass strait australia", "aviation control tower"),
            _m("En la grabación dice que un objeto con luces lo sobrevuela y se mueve a gran velocidad. "
               "Después describe que el motor empieza a fallar.",
               "aircraft instruments panel", "strange lights sky"),
            _m("Sus últimas palabras fueron confusas, seguidas de un ruido metálico de diecisiete segundos. "
               "Después, silencio. Ni el avión ni el cuerpo aparecieron.",
               "radio transmission waves", "search plane ocean"),
            _m("Las explicaciones van desde una desorientación que lo hizo volar invertido y ver el reflejo "
               "de sus propias luces, hasta hipótesis mucho más extrañas. Nunca se confirmó nada.",
               "ocean search rescue", "unsolved aviation mystery"),
        ],
    },
    23: {
        "pregunta": "¿Leyenda medieval o hecho real?",
        "titulo": "Los niños verdes que aparecieron en un pueblo medieval",
        "resumen": ("la historia, narrada desde el siglo doce como crónica y leyenda, de dos niños de piel "
                    "verde que aparecieron en el pueblo inglés de Woolpit"),
        "segments": [
            _m("Dos niños de piel completamente verde aparecieron en un pueblo, hablando un idioma que nadie "
               "entendía y negándose a comer cualquier cosa que no fueran habas.",
               "medieval english village", "green glowing figures"),
            _m("La historia se cuenta desde el siglo doce en Woolpit, Inglaterra. Según las crónicas de la "
               "época, los aldeanos encontraron a los chicos cerca de unos pozos.",
               "medieval manuscript", "english countryside field"),
            _m("Con el tiempo la piel verde se fue aclarando y aprendieron a comer otros alimentos. "
               "El varón murió, pero la niña sobrevivió y aprendió el idioma.",
               "medieval children illustration", "old village well"),
            _m("Ella contó que venían de una tierra sin sol, un lugar en penumbra del que se habían perdido. "
               "Nada de eso pudo comprobarse jamás.",
               "dark underground cave", "medieval storytelling"),
            _m("Hoy se debate si fue una leyenda, una metáfora o niños reales con una enfermedad que les daba "
               "ese color por mala alimentación. La historia sobrevivió ochocientos años.",
               "medieval legend book", "foggy mysterious land"),
        ],
    },
    24: {
        "pregunta": "¿Olfato, instinto o algo inexplicable?",
        "titulo": "El puente del que los perros saltan al vacío",
        "resumen": ("el puente de Overtoun, en Escocia, del que decenas de perros saltaron al vacío "
                    "a lo largo de las décadas, muchos en el mismo punto exacto"),
        "segments": [
            _m("Decenas de perros saltaron al vacío desde un mismo puente de piedra a lo largo de los años, "
               "casi siempre desde el punto exacto. Algunos que sobrevivieron, volvieron a intentarlo.",
               "old stone bridge scotland", "dog on bridge"),
            _m("Es el puente de Overtoun, en Escocia. Los saltos, desde unos quince metros de altura, "
               "se reportan desde hace décadas, sobre todo en días despejados.",
               "scotland countryside bridge", "misty scottish hills"),
            _m("Los dueños contaban que sus perros, de golpe, salían disparados y saltaban sin dudar, "
               "como atraídos por algo que ellos no podían percibir.",
               "dog running fast", "bridge stone parapet"),
            _m("Un investigador propuso una explicación: el fuerte olor de los visones que anidan bajo "
               "el puente dispararía el instinto de caza de los perros, que no ven el vacío tras el muro.",
               "mink animal grass", "bridge wall view"),
            _m("La teoría del olor es la más aceptada, pero no explica todos los casos ni por qué pasa "
               "justo ahí. El puente mantiene su fama siniestra.",
               "scottish bridge fog", "mystery location"),
        ],
    },
    25: {
        "pregunta": "¿Faro, meteoro o encuentro?",
        "titulo": "Rendlesham: el caso ovni mejor documentado de Europa",
        "resumen": ("los extraños hechos de diciembre de mil novecientos ochenta en un bosque de Inglaterra, "
                    "cerca de dos bases militares, reportados por los propios soldados"),
        "segments": [
            _m("Soldados de una base militar entraron a un bosque persiguiendo unas luces extrañas "
               "y volvieron con un relato que todavía se discute cuarenta años después.",
               "dark forest night", "strange lights trees"),
            _m("Fue en diciembre de mil novecientos ochenta, en el bosque de Rendlesham, Inglaterra, "
               "al lado de dos bases usadas por la fuerza aérea de Estados Unidos.",
               "military base night", "english forest winter"),
            _m("Los militares describieron un objeto con luces que se movía entre los árboles. Un oficial "
               "dijo haber tocado una superficie con símbolos y lo dejó todo en un informe oficial.",
               "military officer flashlight", "official report document"),
            _m("Al día siguiente encontraron marcas en el suelo y, según sus mediciones, "
               "una radiación algo elevada en la zona.",
               "ground marks forest", "radiation detector"),
            _m("Los escépticos lo atribuyen al haz de un faro cercano y a la caída de un meteoro esa misma "
               "noche. Para otros, sigue siendo el mejor caso ovni documentado de Europa.",
               "lighthouse beam night", "ufo mystery forest"),
        ],
    },
    26: {
        "pregunta": "¿Motín, piratas o contrabando?",
        "titulo": "El Carroll A. Deering: el velero fantasma del cabo Hatteras",
        "resumen": ("el velero de cinco mástiles Carroll A. Deering hallado encallado en la costa de "
                    "Carolina del Norte en mil novecientos veintiuno, sin un solo tripulante a bordo"),
        "segments": [
            _m("Un enorme velero apareció encallado en un banco de arena, con las velas puestas y la mesa "
               "lista para comer. De sus once tripulantes no quedaba ni uno.",
               "five masted schooner", "north carolina coast storm"),
            _m("Fue a fines de enero de mil novecientos veintiuno, en Diamond Shoals, frente al cabo Hatteras. "
               "El Carroll A. Deering volvía de Sudamérica cuando un faro lo vio pasar con un hombre "
               "en cubierta gritando algo raro sobre la tripulación.",
               "cape hatteras lighthouse", "sailing ship deck 1920s"),
            _m("Cuando los rescatistas subieron, faltaban los botes salvavidas, la rueda del timón, los papeles "
               "de navegación y las pertenencias de los marineros. La comida parecía estar preparándose "
               "en la cocina. Nadie respondía.",
               "empty ship galley", "ship steering wheel"),
            _m("Las teorías fueron desde un motín de la tripulación hasta un ataque de piratas del ron "
               "durante la ley seca. El gobierno de Estados Unidos llegó a investigarlo como un posible "
               "caso internacional.",
               "prohibition era rum runners", "government investigation 1920s"),
            _m("Nunca se encontró a ninguno de los once hombres ni se probó ninguna teoría. El Deering "
               "fue dinamitado por peligroso y sus restos todavía aparecen en la arena.",
               "shipwreck remains beach", "ocean horizon fog"),
        ],
    },
    27: {
        "pregunta": "¿Espía o víctima de un crimen?",
        "titulo": "La mujer de Isdal: la muerta con ocho identidades",
        "resumen": ("el cadáver parcialmente quemado de una mujer no identificada hallado en el valle de "
                    "Isdalen, Noruega, en mil novecientos setenta, rodeado de pistas imposibles"),
        "segments": [
            _m("Encontraron a una mujer muerta y parcialmente quemada en un valle solitario de Noruega. "
               "Viajaba con ocho identidades falsas y nadie supo jamás quién era.",
               "norway valley bergen", "mysterious burned scene"),
            _m("Fue en noviembre de mil novecientos setenta, en el valle de Isdalen, cerca de Bergen. "
               "La policía rastreó sus maletas en una estación de tren: había ropa con las etiquetas "
               "arrancadas y frascos de crema sin marca.",
               "train station lockers", "vintage suitcase luggage"),
            _m("Había cambiado de hotel y de nombre una y otra vez, hablaba varios idiomas y la vieron "
               "nerviosa, como si la siguieran. En un bloc encontraron un código de letras y números "
               "que resultó ser sus fechas y lugares de viaje.",
               "coded notebook cipher", "hotel register book"),
            _m("La autopsia halló pastillas para dormir y monóxido de carbono. Se habló de suicidio, "
               "pero también de que era una espía de la Guerra Fría eliminada por saber demasiado.",
               "cold war espionage", "forensic autopsy vintage"),
            _m("En dos mil diecisiete, análisis de sus dientes sugirieron que creció en Alemania. "
               "Pero su nombre real sigue siendo un misterio más de cincuenta años después.",
               "dna teeth analysis", "cold case evidence box"),
        ],
    },
    28: {
        "pregunta": "¿Se perdieron o huyeron de algo?",
        "titulo": "Los cinco de Yuba County: la noche que nadie entiende",
        "resumen": ("la desaparición en mil novecientos setenta y ocho de cinco jóvenes en California, "
                    "hallados muertos en la montaña tras abandonar su auto en perfecto estado"),
        "segments": [
            _m("Cinco amigos volvían de un partido de básquet y desaparecieron. Encontraron su auto "
               "abandonado en plena montaña nevada, con combustible y en perfecto estado.",
               "abandoned car mountain road", "snowy forest california"),
            _m("Fue en febrero de mil novecientos setenta y ocho, en el norte de California. Los cinco "
               "hombres tenían discapacidades intelectuales leves y eran de costumbres muy rutinarias: "
               "jamás se habrían desviado hacia la montaña por gusto.",
               "basketball game 1970s", "sierra nevada mountains"),
            _m("El auto estaba a kilómetros de su camino, en una ruta que no tenía sentido. No había señales "
               "de choque ni de que se hubiera quedado atascado. Simplemente lo dejaron y caminaron "
               "hacia el frío.",
               "car headlights night", "mountain trail snow"),
            _m("Meses después aparecieron cuatro cuerpos en la montaña. Uno se había refugiado en una "
               "cabaña con comida y mantas, pero igual murió. El quinto nunca se encontró entero.",
               "forest ranger cabin", "search rescue mountains"),
            _m("¿Por qué se internaron en la montaña, de noche, en vez de esperar ayuda? Nadie pudo "
               "explicarlo. Es uno de los casos más desconcertantes de Estados Unidos.",
               "cold case files", "dark forest fog"),
        ],
    },
    29: {
        "pregunta": "¿Murieron en el incendio o no?",
        "titulo": "Los niños Sodder: el incendio sin cenizas",
        "resumen": ("el incendio de mil novecientos cuarenta y cinco en Virginia Occidental tras el cual "
                    "cinco hermanos desaparecieron sin que jamás se hallaran sus restos"),
        "segments": [
            _m("Una casa se incendió en Nochebuena y cinco de los diez hijos desaparecieron. "
               "Lo imposible: entre las cenizas no apareció ni un solo hueso.",
               "house fire night", "1940s family home"),
            _m("Pasó en mil novecientos cuarenta y cinco, en Fayetteville, Virginia Occidental. "
               "Los padres y cuatro hijos escaparon; cinco niños quedaron adentro. El padre quiso volver "
               "a entrar, pero la escalera había desaparecido y el camión no arrancaba.",
               "snowy mountain town", "firefighters 1940s"),
            _m("El incendio consumió todo en menos de una hora, pero los bomberos no encontraron restos "
               "humanos. Antes esa noche, alguien había cortado la línea telefónica. Y meses atrás un hombre "
               "había amenazado a la familia.",
               "cut telephone wire", "burned house ruins"),
            _m("Durante años llegaron supuestas pistas: gente que decía haber visto a los niños vivos, "
               "y hasta una foto anónima de un joven parecido a uno de ellos. Nada se confirmó.",
               "old photograph anonymous", "missing children poster"),
            _m("Los padres pusieron un cartel gigante al costado de la ruta y lo sostuvieron hasta morir. "
               "Nunca supieron si sus cinco hijos murieron esa noche o no.",
               "roadside billboard vintage", "memorial grave family"),
        ],
    },
    30: {
        "pregunta": "¿Cayeron al mar o algo más?",
        "titulo": "El dirigible L-8: la nave que aterrizó sin tripulación",
        "resumen": ("el dirigible de la Armada de Estados Unidos L-8 que en mil novecientos cuarenta y dos "
                    "regresó y aterrizó sin sus dos tripulantes a bordo"),
        "segments": [
            _m("Un dirigible militar salió a patrullar la costa con dos hombres a bordo. Volvió solo, "
               "se desinfló sobre una calle y aterrizó sin nadie adentro.",
               "navy blimp 1940s", "san francisco bay fog"),
            _m("Fue en agosto de mil novecientos cuarenta y dos, sobre la bahía de San Francisco. "
               "El L-8 patrullaba buscando submarinos japoneses cuando reportó haber visto una mancha "
               "de aceite en el mar y fue a investigar.",
               "world war two patrol", "ocean oil slick"),
            _m("Horas después el dirigible apareció a la deriva y cayó sobre un barrio. La puerta estaba "
               "abierta, los chalecos salvavidas seguían adentro, la radio funcionaba y el motor estaba bien. "
               "Los dos tripulantes no estaban.",
               "blimp crash street", "life jackets cabin"),
            _m("No hubo pedido de auxilio ni señal de pelea. Se pensó que uno cayó al mar y el otro intentó "
               "salvarlo, pero el dirigible va tan lento que debieron ser vistos. Nunca aparecieron.",
               "coast guard search", "open aircraft hatch"),
            _m("La Armada cerró el caso sin explicación. Qué pasó en esa cabina entre dos hombres "
               "experimentados sigue sin respuesta ochenta años después.",
               "military report classified", "pacific ocean empty"),
        ],
    },
    31: {
        "pregunta": "¿Baliza militar o algo oculto?",
        "titulo": "UVB-76: la emisora que lleva décadas zumbando",
        "resumen": ("la estación de radio de onda corta rusa, apodada 'El Zumbador', que emite un pitido "
                    "monótono sin fin interrumpido de vez en cuando por voces en ruso"),
        "segments": [
            _m("En una frecuencia de radio hay un zumbido que no para desde hace décadas. "
               "De golpe se corta y una voz lee números y nombres en ruso. Después, otra vez el zumbido.",
               "shortwave radio dial", "radio tower antenna"),
            _m("La estación se conoce como UVB-76 o 'El Zumbador'. Transmite desde Rusia desde al menos "
               "los años ochenta un tono repetido las veinticuatro horas, sin que nadie oficialmente "
               "explique para qué.",
               "soviet radio equipment", "russian military base"),
            _m("Los radioaficionados de todo el mundo la escuchan y graban sus mensajes. A veces se cuela "
               "ruido de fondo, como una conversación lejana, lo que sugiere que hay alguien del otro lado.",
               "person headphones radio", "audio waveform screen"),
            _m("La teoría más aceptada es que sea una baliza militar que mantiene abierto un canal de "
               "comunicación de emergencia. Los mensajes con códigos serían órdenes para unidades militares.",
               "military communication room", "cold war bunker"),
            _m("Nunca hubo confirmación oficial de su función. El Zumbador sigue ahí, en vivo, para "
               "cualquiera que sintonice. Un latido de radio que nadie reconoce como propio.",
               "radio static signal", "frequency spectrum display"),
        ],
    },
    32: {
        "pregunta": "¿Desorientación o algo inexplicable?",
        "titulo": "El Vuelo 19: los cinco aviones que se tragó el mar",
        "resumen": ("la desaparición en mil novecientos cuarenta y cinco de cinco bombarderos de la Marina "
                    "de Estados Unidos durante un vuelo de entrenamiento sobre el Atlántico"),
        "segments": [
            _m("Cinco aviones militares salieron a entrenar sobre el mar y nunca volvieron. El avión enviado "
               "a rescatarlos también desapareció. En total, veintisiete hombres.",
               "navy bomber planes 1940s", "atlantic ocean aerial"),
            _m("Fue en diciembre de mil novecientos cuarenta y cinco, frente a Florida. El llamado Vuelo "
               "diecinueve eran cinco bombarderos en una misión de práctica que debía durar unas horas.",
               "florida coast 1945", "military flight formation"),
            _m("Por radio, el instructor dijo que sus brújulas fallaban y que no reconocía el terreno. "
               "Creía estar sobre un lugar cuando en realidad estaba en otro. Volaron en círculos hasta "
               "quedarse sin combustible.",
               "airplane cockpit compass", "radio communication static"),
            _m("Un hidroavión salió a buscarlos con trece hombres y estalló en el aire poco después del "
               "despegue. De los cinco bombarderos, jamás se halló un solo resto confirmado.",
               "rescue seaplane 1940s", "search operation ocean"),
            _m("El caso alimentó la leyenda del Triángulo de las Bermudas. La explicación más sólida es "
               "una desorientación fatal sobre el mar, pero el misterio de dónde cayeron sigue abierto.",
               "bermuda triangle map", "deep ocean mystery"),
        ],
    },
    33: {
        "pregunta": "¿Accidente, robo o asesinato?",
        "titulo": "Louis Le Prince: el padre del cine que se esfumó de un tren",
        "resumen": ("la desaparición en mil ochocientos noventa del inventor Louis Le Prince, pionero del "
                    "cine, que subió a un tren en Francia y jamás bajó de él"),
        "segments": [
            _m("El hombre que filmó la primera película de la historia subió a un tren para visitar a su "
               "hermano. El tren llegó a destino, pero él no estaba. Ni su equipaje.",
               "steam train 1890s", "vintage train platform"),
            _m("Fue en septiembre de mil ochocientos noventa, en Francia. Louis Le Prince había grabado "
               "escenas en movimiento dos años antes que Edison y los Lumière, y estaba por presentar "
               "su invento en Estados Unidos.",
               "early film camera", "19th century inventor"),
            _m("Testigos lo vieron subir al tren en Dijon. Al llegar a París, su compartimento estaba vacío. "
               "No había señales de que hubiera bajado en ninguna parada ni rastro de su cuerpo o sus cosas.",
               "french railway dijon", "empty train compartment"),
            _m("Las teorías son muchas: un accidente, un robo, un suicidio por deudas, o incluso que lo "
               "hicieron desaparecer por la disputa de la patente del cine, que valía una fortuna.",
               "patent documents vintage", "paris 1890s street"),
            _m("Su familia lo buscó durante años sin resultado. El inventor que pudo haber sido el padre "
               "oficial del cine desapareció justo antes de reclamar su lugar en la historia.",
               "film reel old", "mystery disappearance archive"),
        ],
    },
    34: {
        "pregunta": "¿Un extraño o alguien conocido?",
        "titulo": "Lago Bodom: la masacre que quedó sin culpable",
        "resumen": ("el asesinato de tres adolescentes mientras acampaban a orillas del lago Bodom, "
                    "en Finlandia, en mil novecientos sesenta, con un único sobreviviente"),
        "segments": [
            _m("Cuatro adolescentes acamparon junto a un lago. De madrugada, alguien atacó la carpa. "
               "Tres murieron y el cuarto sobrevivió, pero no recordaba casi nada.",
               "lakeside camping tent", "finland forest lake"),
            _m("Fue en junio de mil novecientos sesenta, en el lago Bodom, cerca de Helsinki. Dos parejas "
               "jóvenes habían ido a pasar la noche. El ataque ocurrió entre las cuatro y las seis "
               "de la mañana.",
               "finnish countryside summer", "vintage camp site"),
            _m("A los tres los apuñalaron y golpearon con saña a través de la tela de la carpa. "
               "El sobreviviente quedó malherido por fuera de ella. Nadie escuchó gritos ni vio huir "
               "a nadie.",
               "damaged tent crime", "police investigation 1960s"),
            _m("Décadas después juzgaron al propio sobreviviente, acusándolo del crimen, pero la justicia "
               "lo absolvió por falta de pruebas. También se sospechó de un vendedor de kioscos cercano.",
               "courtroom trial", "detective evidence board"),
            _m("El caso sigue oficialmente sin resolver. Quién atacó esa carpa junto al lago Bodom "
               "es uno de los mayores misterios criminales de los países nórdicos.",
               "cold case finland", "misty lake dawn"),
        ],
    },
    35: {
        "pregunta": "¿Secuestro o algo peor?",
        "titulo": "Las tres de Springfield: desaparecieron de su propia casa",
        "resumen": ("la desaparición en mil novecientos noventa y dos de tres mujeres de una casa en "
                    "Springfield, Missouri, sin señales de robo ni de lucha"),
        "segments": [
            _m("Tres mujeres desaparecieron de una casa de un día para el otro. Los autos seguían afuera, "
               "las carteras adentro y el perro suelto. Como si se hubieran evaporado.",
               "suburban house night", "front porch missouri"),
            _m("Fue en junio de mil novecientos noventa y dos, en Springfield, Missouri. Una madre, su hija "
               "y una amiga habían festejado una graduación. A la mañana siguiente, ninguna respondía "
               "el teléfono.",
               "graduation celebration 1992", "quiet neighborhood street"),
            _m("Dentro, todo estaba en orden salvo un detalle: la lámpara del porche, rota. No faltaba "
               "dinero ni joyas. Amigos que pasaron ese día incluso contestaron el teléfono sin notar "
               "nada raro.",
               "broken porch light", "untouched living room"),
            _m("Hubo cientos de pistas y hasta un hombre que dijo saber dónde estaban enterradas, "
               "pero nada se comprobó. Se investigaron secuestros, un edificio con hormigón fresco "
               "y decenas de sospechosos.",
               "search investigation police", "cold case tip line"),
            _m("Más de treinta años después, las tres siguen desaparecidas. No hay cuerpos, no hay arrestos, "
               "no hay explicación. Solo una casa que un día quedó vacía.",
               "empty house interior", "missing persons poster"),
        ],
    },
    36: {
        "pregunta": "¿Un animal o algo sin explicación?",
        "titulo": "Las huellas del Diablo: ciento sesenta kilómetros en la nieve",
        "resumen": ("el rastro de pisadas con forma de pezuña que apareció en la nieve del condado de "
                    "Devon, Inglaterra, en mil ochocientos cincuenta y cinco, cruzando campos, techos y muros"),
        "segments": [
            _m("Una mañana de invierno, los vecinos de varios pueblos encontraron en la nieve un rastro "
               "de pisadas con forma de pezuña. Iban en línea recta, sin importar qué hubiera en el camino.",
               "hoof prints snow", "english village winter 1800s"),
            _m("Fue en febrero de mil ochocientos cincuenta y cinco, cerca del estuario del río Exe, "
               "en el condado de Devon, Inglaterra. Aparecieron en varios pueblos a la vez y la prensa "
               "sensacionalista de entonces llegó a hablar de más de cien kilómetros de rastro.",
               "devon countryside snow", "victorian newspaper article"),
            _m("Según esos relatos, las pisadas cruzaban techos, saltaban muros altos y pasaban por caños "
               "estrechos sin cortarse. Hay que aclararlo: nadie siguió el rastro entero, así que esa "
               "distancia es más leyenda que dato comprobado.",
               "snowy rooftops village", "stone wall snow"),
            _m("Se propuso de todo: un tejón, ratones saltarines, un globo meteorológico suelto arrastrando "
               "una cuerda, o varios animales distintos. Ninguna teoría explica el rastro completo.",
               "badger animal snow", "weather balloon vintage"),
            _m("La prensa de entonces lo bautizó 'las huellas del Diablo'. Casi dos siglos después, "
               "nadie sabe con certeza qué dejó esas pisadas aquella noche.",
               "mysterious tracks snow", "foggy english moor"),
        ],
    },
    37: {
        "pregunta": "¿Fenómeno natural desconocido o ilusión?",
        "titulo": "Las luces de Hessdalen: el valle que brilla de noche",
        "resumen": ("las luces inexplicables que aparecen desde los años ochenta en el valle de Hessdalen, "
                    "en Noruega, estudiadas por científicos sin una respuesta definitiva"),
        "segments": [
            _m("En un valle de Noruega aparecen luces flotando de noche. A veces quietas, a veces "
               "disparándose a gran velocidad. Llevan décadas apareciendo y nadie las explica del todo.",
               "glowing lights valley night", "norway mountains dark"),
            _m("El valle de Hessdalen empezó a tener avistamientos frecuentes a principios de los años "
               "ochenta. Los vecinos veían bolas de luz blancas y amarillas que duraban desde segundos "
               "hasta más de una hora.",
               "norwegian rural valley", "strange light orb sky"),
            _m("A diferencia de otros casos, acá los científicos montaron estaciones de medición. "
               "Registraron las luces con cámaras y radares: algo real emite esa energía, no es solo "
               "imaginación.",
               "scientific measuring station", "radar monitoring equipment"),
            _m("Se propuso que sea plasma generado por minerales del suelo, gases que arden en el aire "
               "o reacciones eléctricas en el valle. Hay buenas pistas, pero ninguna explicación cierra "
               "todos los casos.",
               "plasma energy glow", "geology minerals rock"),
            _m("Hessdalen es uno de los pocos misterios de luces que la ciencia estudia en serio y en vivo. "
               "El valle sigue brillando, esperando que alguien entienda por qué.",
               "camera night sky research", "mysterious lights horizon"),
        ],
    },
    38: {
        "pregunta": "¿Accidente o algo más oscuro?",
        "titulo": "Elisa Lam: el ascensor, el tanque de agua y nadie",
        "resumen": ("la muerte de la estudiante Elisa Lam en el tanque de agua de un hotel de Los Ángeles "
                    "en dos mil trece, precedida por un video de ascensor imposible de explicar"),
        "segments": [
            _m("Los huéspedes de un hotel se quejaron de que el agua salía oscura y con mal sabor. "
               "Al revisar los tanques del techo, encontraron el cuerpo de una joven adentro.",
               "hotel water tank rooftop", "old los angeles hotel"),
            _m("Era Elisa Lam, estudiante canadiense de veintiún años, desaparecida en enero de dos mil trece "
               "en el hotel Cecil de Los Ángeles, un edificio con una historia siniestra de crímenes "
               "y muertes.",
               "cecil hotel downtown", "missing student poster"),
            _m("La policía difundió un video del ascensor: Elisa aprieta todos los botones, se asoma al "
               "pasillo como escondiéndose de alguien, gesticula con las manos y habla sola. "
               "El ascensor no se mueve.",
               "elevator security camera", "hotel hallway dark"),
            _m("Para llegar al tanque había que subir al techo y abrir una tapa pesada, así que muchos "
               "hablaron de homicidio. Importante: la tapa estaba abierta y la autopsia no halló signos "
               "de violencia.",
               "rooftop access ladder", "water tank hatch"),
            _m("La conclusión oficial fue muerte accidental por ahogamiento, ligada a un trastorno bipolar "
               "fuera de control. El caso está cerrado, pero el video del ascensor sigue generando "
               "teorías imposibles de probar.",
               "forensic report file", "water tank investigation"),
        ],
    },
    39: {
        "pregunta": "¿Fenómeno paranormal o fraude?",
        "titulo": "Las caras de Bélmez: los rostros del piso de la cocina",
        "resumen": ("los rostros que, según sus dueños, aparecieron y cambiaron solos en el piso de "
                    "cemento de una casa en Bélmez, España, desde mil novecientos setenta y uno"),
        "segments": [
            _m("En el piso de cemento de una cocina empezaron a aparecer caras. Una mujer juró que surgían "
               "solas, que cambiaban de expresión y que, por más que limpiaran, volvían.",
               "face in concrete floor", "old spanish kitchen"),
            _m("Pasó en Bélmez de la Moraleda, un pueblo del sur de España, desde mil novecientos setenta "
               "y uno. La familia dijo que un día apareció un rostro en el suelo. Lo picaron y echaron "
               "cemento nuevo, pero según ellos las caras reaparecieron.",
               "andalusia village spain", "cement floor stains"),
            _m("El caso se volvió famoso en toda España. Llegaron periodistas, curiosos y hasta "
               "investigadores de lo paranormal. Decían que bajo la casa había un viejo cementerio.",
               "crowd outside house", "paranormal investigation 1970s"),
            _m("Algunos análisis sugirieron que las caras tenían pigmentos y pudieron ser pintadas, "
               "quizás como un fraude para atraer turismo. Otros estudios no fueron concluyentes.",
               "chemical pigment test", "skeptic investigation lab"),
            _m("Nunca se demostró del todo si fue un engaño o un fenómeno real. Las caras de Bélmez "
               "siguen siendo el caso paranormal más discutido de España.",
               "mysterious faces wall", "spanish village mystery"),
        ],
    },
    40: {
        "pregunta": "¿Se perdieron o los hicieron desaparecer?",
        "titulo": "La familia Jamison: la camioneta, el dinero y el perro",
        "resumen": ("la desaparición en dos mil nueve de la familia Jamison en Oklahoma, cuya camioneta "
                    "apareció con dinero, el perro con vida y ningún rastro de ellos"),
        "segments": [
            _m("Una familia entera se esfumó mirando un terreno en la montaña. Encontraron su camioneta "
               "con treinta y dos mil dólares adentro y el perro, casi muerto de hambre, todavía ahí.",
               "pickup truck rural oklahoma", "remote hilltop land"),
            _m("Fue en octubre de dos mil nueve, en una zona agreste de Oklahoma. Bobby, Sherilyn y su hija "
               "Madyson, de seis años, habían ido a ver un lote para construir. Nunca regresaron.",
               "oklahoma mountains wilderness", "family photograph 2009"),
            _m("Dentro de la camioneta estaban sus celulares, sus documentos, el dinero y hasta la comida "
               "del perro. Una cámara mostró a la familia cargando cosas, pero el video no aclaraba nada "
               "de lo que pasó después.",
               "truck interior belongings", "security camera footage"),
            _m("Antes de desaparecer, la familia estaba tensa: hablaban de amenazas, de disputas por tierras "
               "y de cartas extrañas. Se investigaron peleas familiares, deudas y hasta una secta.",
               "handwritten threatening note", "rural property dispute"),
            _m("Casi cuatro años después, un cazador halló tres cuerpos a pocos kilómetros. Estaban tan "
               "deteriorados que no se pudo saber cómo murieron. Qué pasó esa tarde sigue sin respuesta.",
               "forest search recovery", "oklahoma backcountry fog"),
        ],
    },
}

PARTS = MISTERIOS
