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
    11: {
        "pregunta": "¿Suerte o maldición?",
        "titulo": "El hombre que sobrevivió a las dos bombas atómicas",
        "resumen": ("Tsutomu Yamaguchi, el japonés que sobrevivió a Hiroshima y tres días "
                    "después a Nagasaki, y vivió más de noventa años"),
        "segments": [
            _m("Sobrevivió a la bomba de Hiroshima. Tres días después estaba en Nagasaki para la segunda. Y vivió para contarlo más de sesenta años.",
               "hiroshima bomb", "atomic bomb cloud"),
            _m("Tsutomu Yamaguchi era ingeniero y estaba de viaje de trabajo en Hiroshima la mañana del seis de agosto de mil novecientos cuarenta y cinco, cuando cayó la primera bomba a pocos kilómetros de él.",
               "hiroshima city 1945", "japanese engineer vintage"),
            _m("Quedó quemado y con los tímpanos reventados, pero logró subir a un tren para volver a su ciudad natal a recuperarse. Su ciudad natal era Nagasaki.",
               "japan train 1945", "bomb survivor bandage"),
            _m("El nueve de agosto, mientras le contaba a su jefe lo que había visto, cayó la segunda bomba sobre Nagasaki. Volvió a sobrevivir, otra vez a pocos kilómetros del epicentro.",
               "nagasaki bomb cloud", "office ruins japan"),
            _m("Japón lo reconoció oficialmente como superviviente doble. Murió en dos mil diez, a los noventa y tres años. Vio dos infiernos y les ganó a los dos.",
               "elderly japanese man", "peace memorial japan"),
        ],
    },
    12: {
        "pregunta": "¿Guerra o papelón?",
        "titulo": "La guerra que un país le declaró a los pájaros y perdió",
        "resumen": ("la Gran Guerra del Emú de mil novecientos treinta y dos, cuando el "
                    "ejército de Australia salió a combatir emús con ametralladoras y perdió"),
        "segments": [
            _m("Un país le declaró la guerra a unos pájaros. Mandó soldados, ametralladoras y munición. Y perdió contra los pájaros.",
               "emu bird", "australian outback"),
            _m("Pasó en Australia, en mil novecientos treinta y dos. Miles de emús invadían los campos de trigo y los arruinaban, así que los granjeros desesperados pidieron ayuda al ejército.",
               "wheat field australia", "emu flock"),
            _m("El ejército envió soldados con ametralladoras. Pero los emús eran rapidísimos, se dispersaban en grupos chicos y esquivaban las balas corriendo en zigzag.",
               "machine gun 1930s", "running emu"),
            _m("Después de semanas, habían gastado miles de balas para matar apenas un puñado de emús. La prensa se burló sin piedad y el ejército terminó retirándose.",
               "vintage newspaper headline", "australian soldiers 1930s"),
            _m("Los emús ganaron la llamada Gran Guerra del Emú. Hasta hoy es el ejemplo favorito de cuando la naturaleza le gana al hombre.",
               "emu close up", "australian bush"),
        ],
    },
    13: {
        "pregunta": "¿El mismo hombre o uno nuevo?",
        "titulo": "El hombre que vivió con una barra de hierro en el cerebro",
        "resumen": ("Phineas Gage, el obrero que en mil ochocientos cuarenta y ocho sobrevivió "
                    "a una barra de hierro que le atravesó el cráneo y le cambió la personalidad"),
        "segments": [
            _m("Una explosión le disparó una barra de hierro que le entró por la mejilla y le salió por arriba de la cabeza. No solo sobrevivió: se levantó y habló.",
               "iron rod", "railroad construction 1800s"),
            _m("Phineas Gage era capataz de una obra de ferrocarril en mil ochocientos cuarenta y ocho. Una carga de dinamita estalló antes de tiempo y lanzó una barra de más de un metro a través de su cabeza.",
               "dynamite explosion", "railroad workers vintage"),
            _m("La barra le destruyó buena parte del lóbulo frontal. Increíblemente, siguió consciente y hablando mientras lo llevaban al médico sentado en una carreta.",
               "skull xray", "vintage doctor examination"),
            _m("Su cuerpo se recuperó, pero su personalidad cambió por completo: el hombre responsable y tranquilo se volvió impulsivo, grosero e irreconocible para sus amigos.",
               "brain diagram", "personality change illustration"),
            _m("Su caso fue clave para descubrir que el cerebro frontal controla la personalidad. Gage vivió doce años más y hoy es uno de los pacientes más famosos de la neurociencia.",
               "neuroscience brain", "old medical museum"),
        ],
    },
    14: {
        "pregunta": "¿Mascota o camarada?",
        "titulo": "El oso que fue soldado en la Segunda Guerra Mundial",
        "resumen": ("Wojtek, el oso pardo que el ejército polaco adoptó en la Segunda Guerra, "
                    "cargó municiones en Monte Cassino y tuvo rango militar"),
        "segments": [
            _m("Un oso cargó cajones de municiones en plena batalla, bajo fuego enemigo. No era una mascota cualquiera: tenía rango militar y hasta libreta de paga.",
               "brown bear", "ww2 soldiers"),
            _m("En mil novecientos cuarenta y dos, soldados polacos le compraron un osito huérfano a un chico en Irán. Lo criaron con leche condensada y lo llamaron Wojtek.",
               "bear cub", "polish soldiers ww2"),
            _m("Wojtek creció entre los soldados: tomaba cerveza, luchaba en broma y dormía en las carpas. Para poder embarcarlo rumbo a Italia, lo alistaron oficialmente como soldado del ejército polaco.",
               "bear with soldiers", "military ship ww2"),
            _m("En la batalla de Monte Cassino, en mil novecientos cuarenta y cuatro, Wojtek ayudó a cargar pesados proyectiles de artillería hasta los cañones y nunca dejó caer uno.",
               "monte cassino battle", "artillery shells ww2"),
            _m("Su unidad lo inmortalizó en su escudo: un oso cargando un proyectil. Terminada la guerra, Wojtek vivió en un zoológico de Escocia, donde los veteranos lo iban a visitar.",
               "military emblem bear", "edinburgh zoo"),
        ],
    },
    15: {
        "pregunta": "¿Vos hubieras salido de la trinchera?",
        "titulo": "La Navidad en que los enemigos dejaron de disparar",
        "resumen": ("la Tregua de Navidad de mil novecientos catorce, cuando soldados enemigos "
                    "de la Primera Guerra salieron de las trincheras a saludarse y jugar al fútbol"),
        "segments": [
            _m("Soldados de bandos enemigos salieron de las trincheras en plena guerra, se dieron la mano y jugaron al fútbol. Al día siguiente, volvieron a dispararse.",
               "ww1 trenches", "soldiers christmas 1914"),
            _m("Fue la Nochebuena de mil novecientos catorce, el primer invierno de la Primera Guerra Mundial. A lo largo del frente, en Bélgica y Francia, los disparos fueron parando solos.",
               "ww1 western front", "snowy trench ww1"),
            _m("Primero fueron villancicos cantados de una trinchera a la otra. Después, soldados alemanes y británicos se animaron a cruzar la tierra de nadie, desarmados.",
               "ww1 soldiers singing", "no mans land ww1"),
            _m("Intercambiaron cigarrillos, chocolate y fotos de sus familias. En varios tramos del frente improvisaron partidos de fútbol con lo que tenían a mano.",
               "soldiers exchanging gifts", "vintage football match"),
            _m("Los generales se horrorizaron y prohibieron que volviera a pasar. Pero por unas horas, en la peor guerra vista hasta entonces, el enemigo volvió a ser un ser humano.",
               "ww1 officers", "christmas candle trench"),
        ],
    },
    16: {
        "pregunta": "¿Suerte o maldición?",
        "titulo": "La mujer que sobrevivió al hundimiento de 3 barcos",
        "resumen": ("Violet Jessop, la camarera que sobrevivió al choque del Olympic, "
                    "al hundimiento del Titanic y al del Britannic"),
        "segments": [
            _m("Trabajaba en los barcos más grandes del mundo. Y los tres en los que estuvo terminaron en desastre. A ella la llamaron la mujer insumergible.",
               "ocean liner ship", "ship deck vintage"),
            _m("Violet Jessop era camarera. Su primer susto llegó a bordo del Olympic, que chocó contra un buque de guerra y volvió a puerto con el casco abierto, pero sin hundirse.",
               "large steamship", "ship collision damage"),
            _m("Un año después la asignaron al barco del que todos hablaban: el Titanic. La madrugada del hundimiento, la subieron a un bote salvavidas y le pusieron un bebé en los brazos.",
               "titanic ship", "lifeboat ocean night"),
            _m("Sobrevivió. Durante la Primera Guerra trabajó de enfermera en el Britannic, el barco gemelo del Titanic, que estalló por una mina y se hundió en menos de una hora.",
               "hospital ship wwi", "sinking ship sea"),
            _m("Saltó al agua y un golpe contra la quilla le partió el cráneo, pero salió viva otra vez. Violet trabajó en el mar hasta jubilarse, y murió tranquila a los ochenta y tres años.",
               "ocean waves rescue", "elderly woman portrait"),
        ],
    },
    17: {
        "pregunta": "¿Imposible o real?",
        "titulo": "El pollo que vivió 18 meses sin cabeza",
        "resumen": ("Mike, el pollo de Colorado que en mil novecientos cuarenta y cinco "
                    "sobrevivió año y medio después de que le cortaran la cabeza"),
        "segments": [
            _m("Un granjero fue a matar un pollo para la cena. Le cortó la cabeza con el hacha. Y el pollo se levantó, caminó y siguió vivo un año y medio.",
               "farm chicken", "farmer axe wood"),
            _m("Pasó en un pueblo de Colorado. El hachazo falló por poco: le voló casi toda la cabeza, pero dejó intacto un trozo de tronco cerebral y un oído.",
               "colorado farm vintage", "rooster close up"),
            _m("Eso bastaba para controlar el corazón, la respiración y los reflejos. Mike intentaba picotear y hasta acicalarse con un ala, aunque ya no tenía con qué.",
               "chicken anatomy diagram", "barn animals"),
            _m("El dueño lo alimentaba dejando caer comida y agua directo en el esófago con un gotero. Mike engordó y se volvió una atracción que recorrió ferias de todo el país.",
               "eyedropper feeding", "country fair crowd"),
            _m("Mike el pollo sin cabeza vivió dieciocho meses así, hasta que murió atragantado una noche. Su pueblo todavía le dedica un festival cada año.",
               "festival poster vintage", "small town usa"),
        ],
    },
    18: {
        "pregunta": "¿Genio o suerte absurda?",
        "titulo": "El hombre al que quisieron arruinar y lo hicieron más rico",
        "resumen": ("Timothy Dexter, el excéntrico estadounidense del siglo dieciocho "
                    "que ganó fortunas con negocios que debían ser ruinosos"),
        "segments": [
            _m("Le dieron los peores consejos de negocios a propósito, para arruinarlo. Siguió todos al pie de la letra. Y se hizo todavía más rico.",
               "colonial merchant portrait", "old gold coins"),
            _m("Timothy Dexter era un hombre sin educación que se casó con una viuda rica. Sus enemigos, envidiosos, le sugerían inversiones ridículas esperando verlo quebrar.",
               "18th century america", "stack letters quill"),
            _m("Le dijeron que mandara calentadores de cama a las islas del Caribe, un lugar tropical. Dexter lo hizo, y allá los vendieron como cucharones para melaza. Ganó una fortuna.",
               "warming pan antique", "caribbean tropical port"),
            _m("Le aconsejaron exportar guantes de lana a esas mismas islas calurosas. Llegaron justo cuando unos barcos asiáticos buscaban mercadería, y los compraron todos.",
               "wool mittens", "sailing cargo ship"),
            _m("Hasta exportó carbón a una ciudad minera de carbón, durante una huelga, y lo vendió carísimo. Dexter escribió un libro sin un solo signo de puntuación. Un afortunado insólito.",
               "coal pile mine", "antique book pages"),
        ],
    },
    19: {
        "pregunta": "¿Progreso o crimen?",
        "titulo": "Las obreras que brillaban en la oscuridad",
        "resumen": ("las Chicas del Radio, las obreras estadounidenses de los años veinte "
                    "que se envenenaron pintando relojes con pintura radiactiva"),
        "segments": [
            _m("Les enseñaron a afinar el pincel con los labios. La pintura brillaba en la oscuridad. Y las estaba matando por dentro.",
               "glowing paint dark", "wristwatch dial vintage"),
            _m("En los años veinte, cientos de jóvenes pintaban las agujas de los relojes con una pintura de radio que brillaba sola. Les decían que era totalmente inofensiva.",
               "factory women 1920s", "paint brush fine"),
            _m("Para hacer la punta fina, se llevaban el pincel a la boca una y otra vez. Jugando, se pintaban las uñas y los dientes para brillar en las fiestas.",
               "art deco party", "glowing teeth dark"),
            _m("Al poco tiempo empezaron a perder dientes, a fracturarse huesos solos y a desarrollar tumores en la mandíbula. La empresa sabía del peligro y lo ocultó.",
               "dental xray", "hospital patient old"),
            _m("Varias llevaron el caso a juicio, ya muy enfermas. Ganaron, y su lucha cambió para siempre las leyes de seguridad laboral. Algunas tumbas todavía emiten radiación.",
               "courtroom 1920s", "cemetery headstones"),
        ],
    },
    20: {
        "pregunta": "¿Espía o farsante genial?",
        "titulo": "El espía que engañó a Hitler con agentes inventados",
        "resumen": ("Juan Pujol García, el agente doble español que inventó una red "
                    "de espías falsos y desvió a los nazis en el Desembarco de Normandía"),
        "segments": [
            _m("Un español convenció a los nazis de que tenía una red de dos docenas de espías en Gran Bretaña. Ninguno existía. Los inventó a todos.",
               "ww2 spy silhouette", "secret documents desk"),
            _m("Juan Pujol García odiaba al fascismo y quiso espiar para los aliados, pero lo rechazaron. Así que se ofreció a los alemanes y empezó a inventarles informes desde Portugal.",
               "lisbon old city", "typewriter vintage letter"),
            _m("Sus reportes eran tan convincentes que los británicos descubrieron la farsa y recién ahí lo ficharon. Le dieron el nombre clave Garbo y una radio de verdad.",
               "radio transmitter ww2", "british intelligence office"),
            _m("Para el Desembarco de Normandía, Garbo convenció a Hitler de que el verdadero ataque vendría por otro lado. Los nazis dejaron divisiones enteras esperando en el lugar equivocado.",
               "normandy beach landing", "military map europe"),
            _m("Terminó la guerra siendo el único hombre condecorado por los dos bandos a la vez. Garbo fingió su propia muerte y se escondió en Venezuela durante décadas.",
               "war medal close up", "venezuela countryside"),
        ],
    },
    21: {
        "pregunta": "¿Accidente o descuido?",
        "titulo": "La ola de cerveza que arrasó un barrio de Londres",
        "resumen": ("la inundación de cerveza de Londres de mil ochocientos catorce, "
                    "cuando el estallido de un tanque gigante mató a ocho personas"),
        "segments": [
            _m("Una ola gigante de cerveza arrasó las calles de Londres y derrumbó casas. No es una broma de borrachos: murieron ocho personas.",
               "london street 1800s", "beer barrels brewery"),
            _m("Todo pasó en una fábrica de cerveza del barrio de Saint Giles. Guardaban la bebida en tanques enormes de madera, reforzados apenas con aros de hierro.",
               "old brewery building", "giant wooden vat"),
            _m("Un aro de metal se soltó de uno de los tanques. La presión reventó todo: más de un millón de litros de cerveza se liberaron de golpe en una reacción en cadena.",
               "broken metal hoop", "flood wave street"),
            _m("La ola marrón tiró paredes y arrasó un barrio pobre de casas apretadas. Varias víctimas eran familias reunidas en sótanos que quedaron inundados en segundos.",
               "collapsed brick house", "victorian slum alley"),
            _m("La justicia lo declaró un accidente, obra de la fatalidad, y nadie fue condenado. Testigos contaron que la gente bajaba a los sótanos a recoger cerveza con baldes.",
               "courtroom old england", "wooden bucket spill"),
        ],
    },
    22: {
        "pregunta": "¿Mala suerte o imposible?",
        "titulo": "El hombre al que le cayó un rayo 7 veces",
        "resumen": ("Roy Sullivan, el guardabosques estadounidense al que lo alcanzó "
                    "un rayo en siete ocasiones distintas y sobrevivió a todas"),
        "segments": [
            _m("Le cayó un rayo encima. Sobrevivió. Y después le volvió a caer otras seis veces. La gente empezó a huir cuando lo veía acercarse.",
               "lightning strike storm", "dark storm clouds"),
            _m("Roy Sullivan era guardabosques en un parque de Virginia, en Estados Unidos. El primer rayo lo alcanzó mientras subía a una torre de vigilancia y le atravesó la pierna.",
               "forest ranger tower", "mountain park forest"),
            _m("A partir de ahí no pararon. Un rayo le quemó las cejas, otro le prendió fuego el pelo, otro lo alcanzó dentro de su propia camioneta mientras manejaba.",
               "ranger truck road", "burnt hat object"),
            _m("Las probabilidades de que le caiga un rayo a una persona siete veces son prácticamente nulas. Los científicos todavía no explican del todo su caso.",
               "probability chart", "weather radar storm"),
            _m("Sullivan quedó en el libro de los récords como la persona que más veces sobrevivió a un rayo. Irónicamente, terminó muriendo por una causa que nada tenía que ver.",
               "record book trophy", "quiet countryside house"),
        ],
    },
    23: {
        "pregunta": "¿Rendirse o resistir?",
        "titulo": "El náufrago que sobrevivió 133 días solo en el mar",
        "resumen": ("Poon Lim, el marinero chino que durante la Segunda Guerra pasó "
                    "cuatro meses solo en una balsa en medio del océano Atlántico"),
        "segments": [
            _m("Su barco se hundió y quedó solo en una balsa diminuta, en medio del océano. Aguantó más de cuatro meses hasta que alguien lo encontró.",
               "life raft ocean", "vast empty sea"),
            _m("Poon Lim era marinero en un carguero británico que un submarino alemán torpedeó en el Atlántico. Él alcanzó a saltar al agua y treparse a una balsa de madera.",
               "cargo ship sinking", "submarine periscope sea"),
            _m("La balsa traía unas pocas latas y agua para días, no para meses. Poon Lim improvisó: juntaba agua de lluvia en la lona y con un clavo fabricó un anzuelo para pescar.",
               "rainwater collection", "fishing hook handmade"),
            _m("Cazó un ave marina y hasta un pequeño tiburón para comer. Vio pasar barcos que no lo rescataron y una tormenta que casi arruina toda su reserva de agua y comida.",
               "seabird ocean", "small shark water"),
            _m("Tras ciento treinta y tres días a la deriva, unos pescadores brasileños lo encontraron frente a la costa. Había bajado poco de peso y pudo caminar solo. Un récord de supervivencia.",
               "brazilian fishermen boat", "survivor rescue shore"),
        ],
    },
    24: {
        "pregunta": "¿Casualidad o genialidad?",
        "titulo": "El chocolate derretido que inventó el microondas",
        "resumen": ("Percy Spencer, el ingeniero estadounidense que descubrió por accidente "
                    "el horno de microondas al derretírsele un chocolate en el bolsillo"),
        "segments": [
            _m("Un ingeniero trabajaba frente a un aparato de radar y notó algo raro: el chocolate que tenía en el bolsillo se le había derretido por completo.",
               "chocolate bar melted", "radar equipment vintage"),
            _m("Percy Spencer era un ingeniero autodidacta, huérfano, que apenas había terminado la primaria. Trabajaba con magnetrones, los tubos que generan las ondas del radar.",
               "engineer laboratory 1940s", "magnetron tube"),
            _m("En vez de ignorar el chocolate derretido, le dio curiosidad. Probó poniendo granos de maíz frente al aparato, y empezaron a estallar en palomitas por toda la sala.",
               "popcorn popping", "corn kernels bowl"),
            _m("Después probó con un huevo, que explotó en la cara de un compañero. Spencer entendió que esas ondas calentaban la comida desde adentro, sin fuego ni llama.",
               "egg experiment", "scientist surprised"),
            _m("Patentó la idea y así nació el horno de microondas. Los primeros eran enormes, del tamaño de una heladera. Hoy hay uno en casi todas las cocinas del mundo.",
               "first microwave oven", "modern kitchen appliance"),
        ],
    },
    25: {
        "pregunta": "¿Loco o adelantado a su tiempo?",
        "titulo": "El médico que decía que había que lavarse las manos y lo encerraron",
        "resumen": ("Ignaz Semmelweis, el médico húngaro que descubrió que lavarse las manos "
                    "salvaba vidas y fue rechazado y humillado por sus colegas"),
        "segments": [
            _m("Un médico descubrió algo tan simple como lavarse las manos salvaba miles de vidas. Sus colegas se rieron de él, lo expulsaron y terminó encerrado en un manicomio.",
               "doctor washing hands", "old hospital ward"),
            _m("Ignaz Semmelweis trabajaba en un hospital de Viena a mediados del siglo diecinueve. Muchísimas madres morían de fiebre después de dar a luz, y nadie entendía por qué.",
               "vienna hospital 1800s", "medical ward beds"),
            _m("Notó algo escalofriante: morían más mujeres en la sala atendida por médicos que en la atendida por parteras. Los médicos venían de cortar cadáveres sin lavarse las manos.",
               "autopsy table old", "doctors examination historical"),
            _m("Ordenó que todos se lavaran las manos con una solución de cloro. Las muertes se desplomaron casi a cero. Tenía la prueba delante de los ojos.",
               "chlorine solution basin", "clean hands water"),
            _m("Pero sus colegas se ofendieron y rechazaron la idea. Semmelweis fue perdiendo la cabeza, lo internaron a la fuerza y murió golpeado en un asilo, sin que nadie le creyera.",
               "asylum old building", "lonely grave cemetery"),
        ],
    },
    26: {
        "pregunta": "¿Cómo sobrevivís a lo imposible?",
        "titulo": "El barco que quedó atrapado en el hielo y los 28 hombres que no murieron",
        "resumen": ("Ernest Shackleton y la expedición del Endurance, atrapados en la Antártida "
                    "en mil novecientos quince, donde los veintiocho tripulantes sobrevivieron"),
        "segments": [
            _m("Su barco quedó aplastado por el hielo en el fin del mundo. Veintiocho hombres quedaron a la deriva en la Antártida, y lo increíble es que ni uno solo murió.",
               "ship trapped in ice", "antarctic expedition 1915"),
            _m("En mil novecientos quince, el explorador Ernest Shackleton intentaba cruzar la Antártida. Pero antes de pisar tierra, su barco, el Endurance, quedó atrapado por el hielo del mar de Weddell.",
               "ernest shackleton portrait", "wooden ship frozen sea"),
            _m("Durante meses el hielo apretó el casco hasta destrozarlo. El barco se hundió y los hombres quedaron acampando sobre témpanos flotantes, comiendo focas y pingüinos para no morir.",
               "ship crushed by ice", "men camping on ice"),
            _m("Shackleton hizo lo impensable: con cinco hombres navegó mil trescientos kilómetros en un bote abierto, cruzando uno de los mares más bravos del planeta, hasta una isla con una estación ballenera.",
               "small lifeboat rough sea", "stormy ocean waves"),
            _m("Volvió a buscar al resto. Tras cuatro intentos, en agosto de mil novecientos dieciséis rescató a los veintidós que había dejado atrás. Los veintiocho volvieron a casa. Ni una sola muerte.",
               "rescue ship antarctica", "survivors on shore cheering"),
        ],
    },
    27: {
        "pregunta": "¿Se puede caer del cielo y vivir?",
        "titulo": "La chica que cayó de un avión a 3000 metros y sobrevivió sola en la selva",
        "resumen": ("Juliane Koepcke, única sobreviviente del vuelo LANSA quinientos ocho en "
                    "mil novecientos setenta y uno, que cayó tres kilómetros y vivió once días en el Amazonas"),
        "segments": [
            _m("Un rayo partió su avión en pleno vuelo. Ella cayó tres kilómetros atada a su asiento, aterrizó en plena selva amazónica y fue la única de noventa y dos personas que sobrevivió.",
               "airplane in storm clouds", "amazon rainforest aerial"),
            _m("Era la Nochebuena de mil novecientos setenta y uno. Juliane Koepcke, de diecisiete años, volaba con su madre sobre Perú cuando el avión entró en una tormenta brutal.",
               "young woman 1970s", "peru jungle plane"),
            _m("El rayo hizo estallar la nave en el aire. Juliane se despertó al día siguiente todavía atada a la fila de asientos, sola en la selva, con la clavícula rota y un ojo hinchado.",
               "plane wreckage jungle", "airplane seat in forest"),
            _m("Sus padres eran biólogos y le habían enseñado una regla: seguir el agua. Caminó once días siguiendo un arroyo que se volvió río, con heridas llenas de gusanos, comiendo solo unos caramelos.",
               "jungle stream water", "person walking rainforest"),
            _m("Al fin encontró una canoa y una cabaña de leñadores que la rescataron. La niña que cayó del cielo se recibió de bióloga y volvió al Amazonas a estudiar los mismos bosques que la salvaron.",
               "wooden canoe river", "rainforest sunlight trees"),
        ],
    },
    28: {
        "pregunta": "¿Venganza o perdón?",
        "titulo": "El hombre al que destrozó un oso y se arrastró 300 kilómetros para vivir",
        "resumen": ("Hugh Glass, el cazador de pieles que en mil ochocientos veintitrés sobrevivió "
                    "al ataque de un oso grizzly y se arrastró para volver, historia que inspiró El Renacido"),
        "segments": [
            _m("Un oso lo destrozó y lo dejó medio muerto. Sus compañeros lo abandonaron creyendo que no pasaría la noche, pero el hombre se arrastró trescientos kilómetros para sobrevivir.",
               "grizzly bear forest", "wounded man wilderness"),
            _m("En mil ochocientos veintitrés, Hugh Glass era cazador de pieles en el oeste salvaje de Norteamérica. Un día sorprendió a una osa grizzly con sus crías.",
               "fur trapper 1800s", "wild american frontier"),
            _m("La osa lo atacó: le rompió una pierna, le arrancó el cuero cabelludo y le dejó las costillas al aire. Dos hombres se quedaron a enterrarlo, pero le robaron el rifle y lo dejaron tirado, vivo.",
               "bear attack illustration", "injured man ground"),
            _m("Glass no se murió. Se acomodó solo el hueso roto, dejó que los gusanos limpiaran sus heridas infectadas y comió raíces y carroña mientras se arrastraba por el bosque hacia un fuerte.",
               "crawling through forest", "man surviving wilderness"),
            _m("Tardó unas seis semanas. Según cuentan, buscó a los que lo abandonaron para vengarse, pero al encontrarlos decidió perdonarlos. Su historia inspiró la película El Renacido.",
               "frontier fort 1800s", "snowy forest river"),
        ],
    },
    29: {
        "pregunta": "¿Orgullo o desastre?",
        "titulo": "El barco de guerra más imponente que se hundió a los 20 minutos de zarpar",
        "resumen": ("El Vasa, el navío de guerra sueco que en mil seiscientos veintiocho se hundió "
                    "en su viaje inaugural dentro del puerto de Estocolmo"),
        "segments": [
            _m("Era el barco de guerra más poderoso y lujoso de su época, el orgullo de todo un reino. Se hundió a los veinte minutos de zarpar, delante de la multitud que lo despedía.",
               "ornate wooden warship", "17th century harbor crowd"),
            _m("Corría el año mil seiscientos veintiocho. El rey de Suecia había ordenado construir el Vasa, un navío enorme, cubierto de tallas doradas y con dos cubiertas de cañones.",
               "swedish king 1600s", "gilded ship carvings"),
            _m("El problema es que lo hicieron demasiado alto y angosto, con mucho peso arriba y poco lastre abajo. Era bellísimo, pero peligrosamente inestable. Nadie se animó a frenar al rey.",
               "ship cannons deck", "unstable tall ship"),
            _m("El día de la partida, una ráfaga de viento inclinó el barco. El agua entró por las portillas de los cañones, que estaban abiertas, y el Vasa se fue al fondo del puerto casi enseguida.",
               "ship tilting sinking", "water flooding ship deck"),
            _m("Murieron unas treinta personas. El Vasa quedó en el barro trescientos treinta y tres años, hasta que lo rescataron casi intacto en mil novecientos sesenta y uno. Hoy es un museo entero.",
               "shipwreck underwater", "vasa museum ship"),
        ],
    },
    30: {
        "pregunta": "¿Quién entra por decisión propia al infierno?",
        "titulo": "El hombre que se dejó atrapar para entrar a Auschwitz a propósito",
        "resumen": ("Witold Pilecki, el oficial polaco que en mil novecientos cuarenta se hizo "
                    "capturar para infiltrarse en Auschwitz y contarle al mundo lo que pasaba adentro"),
        "segments": [
            _m("Mientras todos huían del horror, un hombre hizo lo contrario: se dejó atrapar para entrar a Auschwitz por voluntad propia. Quería contarle al mundo lo que pasaba adentro.",
               "concentration camp gate", "resistance fighter 1940s"),
            _m("Era mil novecientos cuarenta. Witold Pilecki, oficial del ejército clandestino polaco, se metió a propósito en una redada nazi en Varsovia para que lo capturaran y lo mandaran al campo.",
               "warsaw occupation 1940", "polish soldier portrait"),
            _m("Adentro organizó una red de resistencia secreta entre los prisioneros. Armó hasta una radio con piezas robadas y empezó a sacar informes sobre los asesinatos masivos que ocurrían allí.",
               "secret resistance meeting", "hidden radio transmitter"),
            _m("Sus reportes llegaron al gobierno polaco en el exilio y a los aliados. Fue de los primeros en avisar que Auschwitz era una fábrica de muerte. Tras casi tres años, logró escapar.",
               "secret documents papers", "escape barbed wire fence"),
            _m("Sobrevivió a la guerra, pero el régimen comunista que tomó Polonia lo acusó de espía. Lo torturaron y lo fusilaron en mil novecientos cuarenta y ocho. Recién décadas después lo reconocieron como héroe.",
               "prison interrogation shadow", "memorial candle hero"),
        ],
    },
    31: {
        "pregunta": "¿Se puede vender la Torre Eiffel?",
        "titulo": "El estafador que vendió la Torre Eiffel para chatarra, y lo hizo dos veces",
        "resumen": ("Victor Lustig, el célebre estafador que en mil novecientos veinticinco "
                    "vendió la Torre Eiffel como chatarra a empresarios parisinos, y repitió la estafa"),
        "segments": [
            _m("Un hombre vendió la Torre Eiffel para desguace como si fuera dueño. Lo increíble no es solo que le creyeron: es que lo hizo dos veces y nunca lo denunciaron.",
               "eiffel tower 1920s", "elegant con man suit"),
            _m("En mil novecientos veinticinco, el estafador Victor Lustig leyó en el diario que mantener la Torre Eiffel era carísimo y que estaba oxidada. Ahí se le prendió la lamparita.",
               "paris newspaper vintage", "rusty iron tower"),
            _m("Falsificó papeles oficiales del Ministerio de Correos y citó en secreto a varios chatarreros. Les dijo que el gobierno quería vender la torre en silencio, antes de que la gente se enojara.",
               "fake government documents", "business meeting 1920s"),
            _m("Un empresario le pagó una fortuna por los derechos de la chatarra. Lustig huyó con el dinero. Y el estafado estaba tan avergonzado que nunca fue a la policía.",
               "briefcase full money", "man counting cash vintage"),
            _m("Al ver que nadie lo había denunciado, Lustig volvió semanas después y vendió la torre otra vez a otro comprador. Años más tarde cayó preso y terminó sus días en Alcatraz.",
               "eiffel tower sunset", "alcatraz prison island"),
        ],
    },
    32: {
        "pregunta": "¿La pirata más poderosa de la historia?",
        "titulo": "La mujer que comandó 40000 piratas y se retiró ganando",
        "resumen": ("Ching Shih, la pirata china que a principios del siglo diecinueve comandó una "
                    "flota de cientos de barcos y decenas de miles de hombres, y negoció su retiro"),
        "segments": [
            _m("Comandó cientos de barcos y decenas de miles de piratas. Fue tan poderosa que ni la marina imperial pudo vencerla, y lo más raro es cómo terminó su historia.",
               "chinese pirate junk ships", "pirate fleet ocean"),
            _m("A principios del siglo diecinueve, en los mares de China, una mujer llamada Ching Shih se casó con un temido capitán pirata y, cuando él murió, tomó el mando de toda la flota.",
               "chinese woman historical", "ancient china coast"),
            _m("Impuso un código de reglas durísimo y convirtió a sus barcos en una potencia. En su apogeo manejaba una flota gigantesca, con decenas de miles de hombres bajo sus órdenes.",
               "pirate code scroll", "armada of junk boats"),
            _m("Los imperios chino, portugués y británico intentaron hundirla y fracasaron una y otra vez. Era prácticamente invencible en el mar, cobrando impuestos a pueblos enteros de la costa.",
               "naval battle junks", "coastal village china"),
            _m("En vez de morir peleando, en mil ochocientos diez negoció su rendición: amnistía para ella y sus hombres, y se quedó con el botín. Murió vieja y rica, dueña de una casa de juego.",
               "peace negotiation historical", "old wealthy woman china"),
        ],
    },
    33: {
        "pregunta": "¿Genio o insensato?",
        "titulo": "El sastre que saltó de la Torre Eiffel con su paracaídas casero",
        "resumen": ("Franz Reichelt, el sastre que en mil novecientos doce saltó desde la Torre "
                    "Eiffel para probar su traje-paracaídas, con un final trágico"),
        "segments": [
            _m("Un sastre inventó un traje que, según él, funcionaba como paracaídas. Para probarlo subió a la Torre Eiffel y saltó al vacío delante de las cámaras.",
               "early parachute suit", "eiffel tower first deck"),
            _m("Era mil novecientos doce. Franz Reichelt, un sastre de París, estaba obsesionado con crear un traje que permitiera a los aviadores sobrevivir si caían de su avión.",
               "tailor workshop 1900s", "man in bulky suit"),
            _m("Había probado su invento con muñecos tirados desde la ventana, con resultados dispares. Pero estaba convencido de que con el peso de una persona real funcionaría a la perfección.",
               "test dummy falling", "parachute experiment vintage"),
            _m("Consiguió permiso para una demostración desde la Torre Eiffel. Todos le rogaron que usara un maniquí. Él insistió en saltar él mismo, seguro de su traje.",
               "crowd watching tower", "man standing on railing"),
            _m("Saltó desde casi sesenta metros. El traje no se abrió y cayó a plomo ante la multitud horrorizada. Murió en el acto. Su salto quedó filmado y se volvió una advertencia famosa.",
               "falling from height blur", "paris 1912 crowd shocked"),
        ],
    },
    34: {
        "pregunta": "¿Un acto chiquito puede cambiar todo?",
        "titulo": "El piloto que bombardeó una ciudad con chocolate",
        "resumen": ("Gail Halvorsen, el piloto del puente aéreo de Berlín que en mil novecientos "
                    "cuarenta y ocho lanzaba caramelos en paracaídas a los chicos de la ciudad bloqueada"),
        "segments": [
            _m("En plena Guerra Fría, un piloto convirtió sus aviones de guerra en repartidores de dulces. Empezó a bombardear una ciudad entera, pero con caramelos y chocolate.",
               "cargo plane 1948", "children looking at sky"),
            _m("En mil novecientos cuarenta y ocho, los soviéticos bloquearon Berlín occidental. Los aliados armaron un puente aéreo gigante para alimentar a la ciudad desde el cielo, día y noche.",
               "berlin airlift planes", "divided berlin postwar"),
            _m("Un día, el piloto Gail Halvorsen vio a unos chicos harapientos parados junto a la pista. Les repartió las dos barritas de goma de mascar que tenía y les prometió traer más.",
               "ragged children fence", "pilot talking kids"),
            _m("Al día siguiente empezó a lanzar caramelos atados a paracaídas hechos con pañuelos, moviendo las alas del avión para avisar. Los chicos lo esperaban y lo llamaban Tío Alas Movedizas.",
               "candy parachute drop", "handkerchief parachute sky"),
            _m("La idea creció tanto que se volvió una operación oficial: toneladas de chocolate cayeron del cielo sobre Berlín. Aquel gesto chiquito ganó corazones y convirtió a Halvorsen en una leyenda.",
               "chocolate bars falling", "happy children candy"),
        ],
    },
    35: {
        "pregunta": "¿El verdadero Conde de Montecristo?",
        "titulo": "El hijo de una esclava que llegó a general y inspiró Montecristo",
        "resumen": ("Thomas-Alexandre Dumas, hijo de una esclava que se convirtió en el general "
                    "mestizo de mayor rango de su época e inspiró a su hijo, autor de El Conde de Montecristo"),
        "segments": [
            _m("Nació hijo de una esclava y llegó a ser general de un ejército europeo. Su vida de gloria y traición inspiró una de las novelas más famosas del mundo.",
               "napoleonic era general", "18th century battlefield"),
            _m("Thomas-Alexandre Dumas nació en mil setecientos sesenta y dos en una colonia francesa, hijo de un aristócrata y de una mujer esclavizada. De joven lo llevaron a París.",
               "caribbean colony 1700s", "young man paris 1700s"),
            _m("Entró al ejército desde el escalón más bajo porque era mestizo. Pero era tan valiente y brillante que subió a toda velocidad hasta convertirse en general de división.",
               "french revolution army", "military officer uniform"),
            _m("Comandó miles de soldados en las guerras revolucionarias y se ganó el apodo del Diablo Negro. Fue el hombre de piel negra de mayor rango en un ejército europeo de su tiempo.",
               "cavalry charge historical", "general on horseback"),
            _m("Cayó en desgracia y terminó prisionero y empobrecido. Su hijo, el novelista Alexandre Dumas, se inspiró en él para crear al héroe de El Conde de Montecristo.",
               "dark prison cell", "classic novel open book"),
        ],
    },
    36: {
        "pregunta": "¿Hombres murciélago en la Luna?",
        "titulo": "El diario que convenció a Nueva York de que había vida en la Luna",
        "resumen": ("El Gran Engaño de la Luna de mil ochocientos treinta y cinco, cuando el diario "
                    "The Sun publicó que se había descubierto vida y civilización en la Luna"),
        "segments": [
            _m("Un diario anunció que habían descubierto vida en la Luna: unicornios, castores que caminaban en dos patas y hombres con alas de murciélago. Y miles de personas se lo creyeron.",
               "vintage newspaper 1800s", "fantastical moon creatures"),
            _m("En mil ochocientos treinta y cinco, el periódico The Sun de Nueva York publicó una serie de artículos sobre increíbles observaciones hechas con un telescopio gigantesco.",
               "old printing press", "antique telescope observatory"),
            _m("Decían que un famoso astrónomo había visto en la Luna bosques, mares, bisontes y hasta templos. El relato era tan detallado que parecía ciencia seria.",
               "moon surface illustration", "19th century astronomer"),
            _m("El gancho era perfecto: el astrónomo citado existía de verdad y estaba lejos, en Sudáfrica, así que nadie podía desmentirlo rápido. Las ventas del diario se dispararon.",
               "crowd reading newspaper", "south africa telescope"),
            _m("Todo era un invento de un periodista para vender más ejemplares. Semanas después admitieron el engaño. Fue una de las noticias falsas más famosas de la historia, mucho antes de internet.",
               "newspaper headlines pile", "hoax revealed vintage"),
        ],
    },
    37: {
        "pregunta": "¿Meterse el virus para no enfermar?",
        "titulo": "La mujer que trajo la vacuna antes de que existieran las vacunas",
        "resumen": ("Lady Mary Wortley Montagu, que en mil setecientos veintiuno introdujo en "
                    "Inglaterra la inoculación contra la viruela que había visto en el Imperio Otomano"),
        "segments": [
            _m("Antes de que existiera la vacuna, una mujer propuso algo que sonaba a locura: meterse un poco del virus para no enfermarse de gravedad. La idea salvó millones de vidas.",
               "18th century noblewoman", "smallpox epidemic historical"),
            _m("A principios del siglo dieciocho, la viruela mataba a muchísima gente. Lady Mary Wortley Montagu, una aristócrata inglesa, había sobrevivido a la enfermedad con la cara marcada.",
               "aristocratic lady portrait", "london 1700s street"),
            _m("Viviendo en Estambul, vio que las mujeres locales practicaban algo asombroso: raspaban un poco de pus de un enfermo leve y lo metían bajo la piel de una persona sana para protegerla.",
               "ottoman istanbul 1700s", "old folk medicine hands"),
            _m("Quedó tan convencida que hizo inocular a su propio hijo. Al volver a Inglaterra, en mil setecientos veintiuno, promovió el método y hasta logró que lo probara la familia real.",
               "child inoculation historical", "royal court england"),
            _m("Los médicos la miraron con desconfianza por ser mujer y extranjera la idea. Pero funcionaba. Esa práctica fue la antesala de la vacuna que décadas después venció a la viruela.",
               "doctors skeptical 1700s", "vaccine medical history"),
        ],
    },
    38: {
        "pregunta": "¿Prisioneros de sus propias cosas?",
        "titulo": "Los hermanos que murieron sepultados por 130 toneladas de basura en su casa",
        "resumen": ("Los hermanos Collyer, acumuladores de Nueva York hallados muertos en mil "
                    "novecientos cuarenta y siete entre toneladas de objetos y trampas caseras"),
        "segments": [
            _m("Dos hermanos ricos se encerraron en su casa y la fueron llenando de cosas durante décadas. Los encontraron muertos entre túneles de basura y trampas que ellos mismos armaron.",
               "cluttered dark house", "newspaper piles hoarding"),
            _m("Homer y Langley Collyer vivían como ermitaños en una mansión de Nueva York. Con los años dejaron de salir y empezaron a acumular absolutamente todo lo que entraba a la casa.",
               "harlem brownstone house", "1940s new york street"),
            _m("Juntaron más de ciento treinta toneladas de objetos: diarios viejos, pianos, muebles, hasta el chasis de un carruaje. Para moverse cavaron túneles entre las montañas de cosas.",
               "mountains of junk", "tunnel through clutter"),
            _m("Como temían a los intrusos, Langley armó trampas con la propia basura, listas para caer sobre cualquiera que entrara sin permiso. Y una de esas trampas se volvió contra él.",
               "booby trap junk", "dark cluttered hallway"),
            _m("En mil novecientos cuarenta y siete, Langley murió aplastado por su trampa mientras le llevaba comida a su hermano ciego y paralítico. Homer, sin nadie que lo cuidara, murió de hambre a su lado.",
               "police searching house", "abandoned cluttered room"),
        ],
    },
    39: {
        "pregunta": "¿Juzgar a un muerto?",
        "titulo": "El Papa que desenterró a otro Papa muerto para enjuiciarlo",
        "resumen": ("El Sínodo del Cadáver del año ochocientos noventa y siete, cuando el Papa "
                    "Esteban VI hizo desenterrar el cuerpo del Papa Formoso para someterlo a juicio"),
        "segments": [
            _m("Un Papa ordenó algo macabro: desenterrar el cadáver de otro Papa, sentarlo en un trono y hacerle un juicio formal. El acusado llevaba meses muerto.",
               "medieval pope throne", "dark gothic cathedral"),
            _m("Corría el año ochocientos noventa y siete, en una Roma llena de intrigas por el poder de la Iglesia. El Papa Esteban VI odiaba a su antecesor, el ya fallecido Papa Formoso.",
               "medieval rome city", "ancient church interior"),
            _m("Hizo exhumar el cuerpo putrefacto de Formoso, lo vistió con las ropas papales y lo sentó en un trono. Pusieron a un diácono detrás para que respondiera por el muerto.",
               "exhumed corpse robes", "empty throne shadows"),
            _m("Lo acusaron de haber llegado al papado de forma ilegal. Por supuesto, el cadáver fue declarado culpable: le anularon todos sus actos y le cortaron los tres dedos con que bendecía.",
               "medieval trial scene", "candlelit church ceremony"),
            _m("Arrojaron el cuerpo al río Tíber. Poco después, el pueblo se rebeló: Esteban VI terminó preso y murió estrangulado en su celda. Y prohibieron volver a juzgar a un muerto.",
               "body thrown river", "medieval prison cell"),
        ],
    },
    40: {
        "pregunta": "¿Una computadora de hace dos mil años?",
        "titulo": "La computadora griega de 2000 años que nadie sabía explicar",
        "resumen": ("El mecanismo de Antikythera, un artefacto griego de engranajes de más de dos mil "
                    "años, considerado la primera computadora analógica de la historia"),
        "segments": [
            _m("De un naufragio sacaron un pedazo de bronce corroído. Tardaron décadas en entender que era una computadora con engranajes, construida hace más de dos mil años.",
               "corroded bronze artifact", "ancient greek gears"),
            _m("En mil novecientos uno, unos buzos que buscaban esponjas hallaron un barco hundido cerca de la isla griega de Antikythera, lleno de estatuas y ánforas antiguas.",
               "greek shipwreck divers", "ancient amphora statues"),
            _m("Entre los restos había un bulto de bronce verdoso que nadie entendía. Con los años, las radiografías revelaron adentro decenas de engranajes diminutos, encajados con una precisión asombrosa.",
               "x-ray ancient device", "tiny bronze gears closeup"),
            _m("Resultó ser una máquina de calcular el cielo: con una manija, mostraba las posiciones del Sol y la Luna, predecía eclipses y marcaba hasta las fechas de los Juegos Olímpicos.",
               "astronomical calculation device", "sun moon eclipse diagram"),
            _m("Lo más increíble es que algo tan complejo no volvió a verse por mil cuatrocientos años. Los griegos antiguos habían construido la primera computadora de la historia, y luego se perdió.",
               "antikythera mechanism museum", "ancient greek technology"),
        ],
    },
}

PARTS = HISTORIAS
