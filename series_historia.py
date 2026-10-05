"""Guiones de la serie 'Historia en 60 Segundos' (canal 2).

Cada episodio es UNA historia narrada: gancho (intriga en 2 frases) ->
momentos del relato (cada uno con sus imágenes) -> remate con CTA.
Números SIEMPRE en palabras (el TTS los lee mejor). 100-165 palabras.
"""

from series_data import BACKGROUNDS

KEYWORDS = [
    "shorts", "historia", "historias reales", "datos históricos", "sabias que",
    "historia en 60 segundos", "curiosidades históricas", "cultura general",
    "aprender historia", "relatos", "viral",
]


def title_for(part: int) -> str:
    """Título propio por episodio (mejor búsqueda que 'pt. N')."""
    return f"{HISTORIAS[part]['titulo']} | Historia en 60 Segundos"


def descripcion(parte: int, resumen: str) -> str:
    return (
        "🏛️ Historias reales que parecen inventadas, contadas en un minuto.\n\n"
        f"📌 Episodio {parte}: {resumen}.\n\n"
        "💡 Seguime para una historia nueva cada día: la historia también se "
        "puede aprender en 60 segundos.\n\n"
        "historia, historias reales, datos históricos, curiosidades históricas, "
        "sabías que, cultura general, aprender historia.\n\n"
        "#shorts #historia #historiasreales #sabiasque #culturageneral #datoshistoricos"
    )


def background_for(part: int) -> str:
    """Mismo set de fondos rotativos que el canal 1 (desfasado una posición
    para que el mismo número de episodio no repita fondo entre canales)."""
    return BACKGROUNDS[part % len(BACKGROUNDS)]


def _m(text, *imgs):
    return {"kind": "fact", "text": text, "imgs": list(imgs)}


HISTORIAS = {
    1: {
        "pregunta": "¿Lealtad o locura?",
        "titulo": "El soldado que peleó 29 años una guerra terminada",
        "resumen": ("Hiroo Onoda, el oficial japonés que siguió combatiendo en una isla "
                    "de Filipinas hasta mil novecientos setenta y cuatro"),
        "segments": [
            _m("Este soldado siguió peleando una guerra que había terminado veintinueve años antes. Y cuando por fin se rindió, lo hizo con honores.",
               "soldier jungle", "ww2 soldier"),
            _m("Hiroo Onoda era un oficial japonés destinado a una isla de Filipinas en mil novecientos cuarenta y cuatro. Su orden fue clara: resistir hasta que lo releven.",
               "philippines island jungle", "pacific war"),
            _m("Cuando Japón se rindió, Onoda no lo creyó: pensó que los panfletos tirados desde los aviones eran una trampa del enemigo.",
               "old airplane sky", "vintage leaflets"),
            _m("Vivió veintinueve años escondido en la selva: comía cocos y bananas, robaba arroz y seguía la guerra por su cuenta.",
               "jungle survival", "tropical jungle hut"),
            _m("En mil novecientos setenta y cuatro, su antiguo comandante viajó a la isla y le dio la orden de deponer las armas. Recién ahí entregó su espada, intacta.",
               "katana sword", "japan ceremony"),
        ],
    },
    2: {
        "pregunta": "¿Histeria colectiva o algo más?",
        "titulo": "La plaga del baile que mató de agotamiento",
        "resumen": ("la plaga de baile de Estrasburgo de mil quinientos dieciocho, cuando "
                    "cientos de personas bailaron sin poder parar"),
        "segments": [
            _m("Una mujer empezó a bailar en plena calle. No paró en seis días. Y a la semana, bailaban con ella más de treinta personas.",
               "medieval dance painting", "medieval town"),
            _m("Pasó en Estrasburgo, en mil quinientos dieciocho. Frau Troffea bailaba sin música y sin descanso, hasta desmayarse. Al despertar, seguía bailando con los pies destrozados.",
               "strasbourg old town", "medieval street"),
            _m("Las autoridades pensaron que la cura era más baile: contrataron músicos y armaron un escenario. Fue peor: llegaron a ser cuatrocientos, y varios murieron de agotamiento.",
               "medieval musicians", "medieval festival painting"),
            _m("Los historiadores creen que fue histeria colectiva: la ciudad venía de hambrunas y pestes, y el estrés extremo estalló en forma de baile imparable.",
               "medieval plague painting", "old manuscript"),
            _m("Recién pararon cuando los llevaron a rezar a un santuario en la montaña. Es uno de los misterios más raros de la historia, y nunca se resolvió del todo.",
               "mountain chapel", "candles church"),
        ],
    },
    3: {
        "pregunta": "¿Coraje o suicidio político?",
        "titulo": "La guerra más corta de la historia",
        "resumen": ("la guerra Anglo-Zanzibar de mil ochocientos noventa y seis, "
                    "que duró entre treinta y ocho y cuarenta y cinco minutos"),
        "segments": [
            _m("La guerra más corta de la historia duró menos de una hora. Un sultanato se animó a desafiar al Imperio Británico. Fue un error muy costoso.",
               "zanzibar island", "british warships 1890s"),
            _m("En agosto de mil ochocientos noventa y seis, el sultán Khalid bin Barghash tomó el poder sin la autorización de los británicos, que tenían el control de la zona.",
               "sultan palace east africa", "british empire map"),
            _m("Los ingleses le dieron un ultimátum: rendirse antes de las nueve de la mañana del veintisiete de agosto. Khalid no lo hizo, así que la Royal Navy abrió fuego.",
               "royal navy warship", "cannon fire ship"),
            _m("En treinta y ocho minutos, el palacio quedó destruido, la pequeña armada zanzibarí fue hundida y más de quinientos soldados del sultán cayeron fuera de combate.",
               "palace ruins africa", "naval battle 1890s"),
            _m("Khalid escapó a la embajada alemana y el nuevo sultán aceptó las condiciones británicas ese mismo día. Treinta y ocho minutos: el conflicto armado más breve registrado en la historia.",
               "white flag surrender", "zanzibar harbor"),
        ],
    },
    4: {
        "pregunta": "¿Enfermedad o fenómeno sin nombre?",
        "titulo": "El hombre que nunca se llenaba",
        "resumen": ("Tarrare, el soldado francés del siglo dieciocho con un apetito "
                    "absolutamente insaciable que dejó perplejos a los médicos"),
        "segments": [
            _m("Imaginá un hombre que podía comerse un gato entero de un saque, y seguir con hambre. No es ficción: se llamaba Tarrare y vivió en Francia a fines del siglo dieciocho.",
               "france 18th century", "hungry man illustration"),
            _m("Tarrare nacía con un metabolismo incomprensible: comía el equivalente a la comida de quince personas por día y aun así estaba siempre flaco y famélico.",
               "medical illustration old", "french revolution era"),
            _m("Los médicos lo estudiaron en el hospital: se comió una carretilla entera de manzanas, una botella de aceite, serpientes vivas, y hasta un gato delante de los asombrados cirujanos.",
               "hospital old painting", "doctor examination historical"),
            _m("El ejército francés intentó usarlo como espía: podía tragar mensajes en papeles encerados. El problema fue que era tan impredecible que terminaron expulsándolo.",
               "french soldier uniform", "secret message scroll"),
            _m("Murió a los veintiséis años, con síntomas que los médicos nunca pudieron explicar del todo. Su caso sigue siendo un misterio para la ciencia.",
               "old grave cemetery", "medical mystery illustration"),
        ],
    },
    5: {
        "pregunta": "¿Accidente o negligencia?",
        "titulo": "La ola de melaza que inundó una ciudad",
        "resumen": ("el desastre de Boston de mil novecientos diecinueve, cuando una ola "
                    "de melaza de ocho metros arrasó un barrio entero"),
        "segments": [
            _m("Una ola de ocho metros de altura arrasó las calles de Boston. No era agua: era melaza hirviente.",
               "boston street 1919", "molasses flood damage"),
            _m("Fue en enero de mil novecientos diecinueve. Un enorme tanque de almacenamiento de melaza colapsó de repente. Contenía más de ocho millones de litros. La ola avanzó a casi cincuenta kilómetros por hora.",
               "large industrial tank", "factory explosion fire"),
            _m("La melaza destruyó edificios, aplastó el elevado del tren y atrapó caballos, personas y todo lo que encontró a su paso. Murieron veintiuna personas y ciento cincuenta resultaron heridas.",
               "destroyed buildings debris", "rescue workers historical"),
            _m("Las investigaciones determinaron que el tanque había sido construido de forma deficiente y que la empresa ignoró múltiples advertencias de que tenía fisuras.",
               "cracked metal tank", "court hearing 1920s"),
            _m("Boston tardó semanas en limpiar el desastre. Vecinos del barrio contaban que el dulce olor de la melaza persistió durante años.",
               "street cleanup workers", "boston harbor vintage"),
        ],
    },
    6: {
        "pregunta": "¿Atrapado o eligió quedarse?",
        "titulo": "El hombre que vivió 18 años en un aeropuerto",
        "resumen": ("Mehran Karimi Nasseri, el iraní que vivió desde mil novecientos ochenta y ocho "
                    "hasta dos mil seis en la Terminal Uno de Charles de Gaulle"),
        "segments": [
            _m("Un hombre vivió dieciocho años dentro de un aeropuerto. Sin salir. Sin pasaporte válido. Y sin que nadie pudiera obligarlo a marcharse.",
               "airport terminal", "man alone airport"),
            _m("Mehran Karimi Nasseri era un iraní expulsado de su país que llegó al aeropuerto Charles de Gaulle de París en mil novecientos ochenta y ocho. Al aterrizar, sus documentos habían desaparecido.",
               "charles de gaulle airport", "passport documents"),
            _m("Sin papeles no podía entrar a Francia, pero tampoco podía volar a ningún destino. Quedó atrapado en la Terminal Uno, en tierra de nadie legal.",
               "airport transit zone", "immigration office"),
            _m("Se instaló en una butaca de plástico, vivía de comida de fast food y leía libros. Los empleados lo conocían, algunos le traían ropa. Spielberg se inspiró en su historia para la película La Terminal.",
               "airport plastic chairs", "terminal movie poster"),
            _m("En dos mil seis fue internado por problemas de salud. En dos mil veintidós regresó al aeropuerto, donde murió ese mismo año. Dieciocho años en la Terminal Uno.",
               "airport bench empty", "paris airport exterior"),
        ],
    },
    7: {
        "pregunta": "¿Vos hubieras apretado el botón?",
        "titulo": "El soldado que salvó al mundo con un 'no'",
        "resumen": ("Stanislav Petrov, el oficial soviético que en mil novecientos ochenta y tres "
                    "evitó una guerra nuclear al ignorar una alarma de misiles"),
        "segments": [
            _m("Un hombre decidió no apretar un botón. Esa decisión puede haber salvado a la humanidad.",
               "nuclear missile silo", "cold war bunker"),
            _m("La noche del veintiséis de septiembre de mil novecientos ochenta y tres, el teniente coronel soviético Stanislav Petrov estaba a cargo del sistema de alerta de misiles. El sistema le indicó que cinco misiles nucleares estadounidenses se dirigían hacia la Unión Soviética.",
               "soviet military base", "radar screen cold war"),
            _m("El protocolo era claro: notificar de inmediato al mando superior y prepararse para el contraataque. Hacerlo hubiera desencadenado una respuesta nuclear que podría haber matado a millones.",
               "nuclear explosion mushroom cloud", "soviet command center"),
            _m("Petrov dudó. El sistema tenía historial de errores. Y un ataque real de los Estados Unidos no sería de apenas cinco misiles. Reportó la alarma como un fallo técnico.",
               "computer screen alarm", "military officer desk"),
            _m("Tenía razón: fue un error del satélite al leer el reflejo del sol sobre las nubes. Petrov fue amonestado por no seguir el protocolo. El mundo nunca se enteró hasta años después.",
               "satellite space orbit", "peace dove sky"),
        ],
    },
    8: {
        "pregunta": "¿Estrés o misterio?",
        "titulo": "La epidemia de risa que cerró escuelas",
        "resumen": ("la epidemia de risa de Tanganica de mil novecientos sesenta y dos, "
                    "cuando la risa incontrolable contagió a cientos de estudiantes"),
        "segments": [
            _m("Un grupo de chicas de una escuela empezó a reírse sin poder parar. No era broma. La risa terminó cerrando varios colegios.",
               "school classroom africa 1960s", "laughing students"),
            _m("Todo comenzó el treinta de enero de mil novecientos sesenta y dos, en un internado femenino de Tanganica, cerca del lago Victoria. Tres alumnas empezaron con ataques de risa que duraban horas, incluso días.",
               "lake victoria africa", "boarding school building"),
            _m("El contagio fue rápido: en pocas semanas más de noventa y cinco de las ciento cincuenta y nueve alumnas de la escuela sufrían los ataques. Se sumaron llantos, desmayos y dolor.",
               "crowded classroom", "medical checkup africa"),
            _m("La epidemia se extendió a comunidades vecinas y afectó a más de mil personas en total. Los médicos no encontraron ninguna causa física.",
               "village africa 1960s", "doctor examining patient"),
            _m("El diagnóstico fue histeria masiva psicogénica: el estrés de la vida en los internados y la tensión social en el recién independizado Tanganica se canalizaron en síntomas físicos reales.",
               "mental health stress illustration", "africa independence ceremony"),
        ],
    },
    9: {
        "pregunta": "¿Locura o provocación genial?",
        "titulo": "El caballo que casi llega a cónsul",
        "resumen": ("Incitato, el caballo favorito del emperador Calígula, "
                    "al que se dice quiso nombrar cónsul de Roma"),
        "segments": [
            _m("El emperador romano Calígula amaba tanto a su caballo que lo convirtió en sacerdote y, según los historiadores antiguos, quería nombrarlo cónsul. No, no es un chiste.",
               "roman emperor statue", "horse ancient rome"),
            _m("Incitato era el caballo de carreras favorito de Calígula. El emperador le construyó un establo de mármol, le asignó esclavos propios y lo hacía comer con vajilla de oro.",
               "marble stable ancient", "roman horse racing"),
            _m("Según el historiador Suetonio, Calígula hizo que los vecinos guardaran silencio para que el caballo pudiera dormir bien la noche antes de las carreras.",
               "ancient rome neighborhood", "roman sleeping quarters"),
            _m("La idea del consulado aparece en las crónicas de la época como una provocación deliberada de Calígula para humillar al Senado romano, al que despreciaba profundamente.",
               "roman senate building", "ancient roman senate"),
            _m("Nunca se concretó el nombramiento: Calígula fue asesinado en el año cuarenta y uno antes de poder hacerlo. Pero la historia de Incitato sobrevivió dos mil años.",
               "roman conspiracy assassination", "ancient rome ruins"),
        ],
    },
    10: {
        "pregunta": "¿Te quedarías viviendo ahí?",
        "titulo": "La ciudad que lleva más de 60 años incendiada",
        "resumen": ("Centralia, Pensilvania, la ciudad que tiene un incendio subterráneo "
                    "activo desde mil novecientos sesenta y dos"),
        "segments": [
            _m("Hay una ciudad en Estados Unidos con un incendio que arde bajo tierra desde hace más de sesenta años. Nadie lo pudo apagar. La ciudad quedó casi vacía.",
               "smoke coming from ground", "abandoned town"),
            _m("Centralia era un pueblo minero de Pensilvania. En mil novecientos sesenta y dos, un incendio en un relleno sanitario llegó hasta una veta de carbón abandonada y se propagó por los túneles.",
               "coal mine pennsylvania", "underground fire smoke"),
            _m("El gobierno intentó apagarlo durante años. Inundaron los túneles, excavaron, usaron espuma ignífuga. Nada funcionó. El carbón sigue ardiendo a más de cuatrocientos grados.",
               "firefighters extinguishing", "mining tunnel underground"),
            _m("Con el tiempo, el suelo empezó a calentarse, el dióxido de carbono llenó los sótanos y el asfalto de las calles se agrietaba dejando escapar humo. La mayoría de los mil cien habitantes evacuaron.",
               "cracked road smoke", "abandoned house windows"),
            _m("Hoy viven menos de diez personas en Centralia. Las calles agrietadas y el humo que sale del suelo la convirtieron en un destino turístico fantasma que inspiró la película Silent Hill.",
               "centralia ghost town", "silent hill movie scene"),
        ],
    },
}

PARTS = HISTORIAS
