"""Layout documental (misterios): elección de imágenes, eventos y filtros. Sin red ni ffmpeg."""
from src import documental as D
from src import stock
from src.subtitles import build_ass
from src.transcribe import Word


def _img(i):
    return {"id": f"wiki:{i}", "url": f"https://up/{i}.jpg", "title": f"File:{i}.jpg", "credit": f"«{i}»"}


def test_plan_no_repite_mientras_queden_nuevas():
    pool = {"caso": [_img("a"), _img("b"), _img("c")], "lugar": [_img("d")]}
    plan = D.plan_images([["caso"], ["caso", "lugar"], ["lugar"]], fetch=lambda q: pool[q])
    ids = [[im["id"] for im in fila] for fila in plan]
    assert ids[0] == ["wiki:a", "wiki:b"]
    assert ids[1] == ["wiki:c", "wiki:d"]
    # "lugar" ya se usó entera y es la que está en pantalla: no hay con qué cambiar -> queda la anterior
    assert ids[2] == []


def test_plan_sin_nuevas_vuelve_a_la_menos_reciente_distinta_de_la_que_esta():
    pool = {"caso": [_img("a"), _img("b")]}
    plan = D.plan_images([["caso"], ["caso"], ["caso"]], fetch=lambda q: pool[q])
    ids = [[im["id"] for im in fila] for fila in plan]
    assert ids == [["wiki:a", "wiki:b"], ["wiki:a"], ["wiki:b"]]


def test_plan_un_error_en_un_articulo_no_corta_el_resto():
    def fetch(q):
        if q == "roto":
            raise RuntimeError("429")
        return [_img("a")]
    assert D.plan_images([["roto", "bueno"]], fetch=fetch)[0][0]["id"] == "wiki:a"


def test_hold_events_sin_huecos_y_arranca_en_cero():
    evs = D.hold_events([{"card": "p1", "start": 4.0, "end": 6.0},
                         {"card": "p2", "start": 20.0, "end": 25.0}], duration=50.0)
    assert evs[0]["start"] == 0.0 and evs[0]["end"] == 20.0     # cubre el momento sin imagen
    assert evs[1]["end"] == 50.0
    assert evs[0]["dur_in"] > 20.0                               # sigue hasta que la 2a se fundió
    assert evs[1]["dur_in"] == 30.0


def test_video_filters_primera_imagen_sin_fundido_y_subtitulos_al_final():
    evs = D.hold_events([{"card": "p1", "start": 0.0, "end": 5.0},
                         {"card": "p2", "start": 5.0, "end": 9.0}], duration=9.0)
    parts = D.video_filters(evs, 1080, 1920, "captions.ass")
    c0 = next(p for p in parts if p.endswith("[c0]"))
    c1 = next(p for p in parts if p.endswith("[c1]"))
    assert "fade" not in c0            # el primer cuadro del video ya es la foto, no un fundido desde negro
    assert "fade=t=in" in c1 and "setpts=PTS+5.000/TB" in c1
    assert parts[-1].endswith("subtitles=captions.ass[v]")


def test_filtro_de_imagenes_del_articulo():
    ok = {"mime": "image/jpeg", "width": 3264, "height": 2448, "extmetadata": {}}
    assert stock.usable_article_image("File:Keddie Cabin 28.jpg", ok)
    assert not stock.usable_article_image("File:Flag of California.jpg", ok)              # plantilla
    assert not stock.usable_article_image("File:Keddie crime scene - cabin interior.jpg", ok)  # sangre
    assert not stock.usable_article_image("File:Chica.jpg", {**ok, "width": 287})         # muy chica
    assert not stock.usable_article_image("File:Logo.svg", {**ok, "mime": "image/svg+xml"})
    no_libre = {**ok, "extmetadata": {"NonFree": {"value": "true"}}}
    assert not stock.usable_article_image("File:Keddie murders victims.jpg", no_libre)    # fair use


def test_respuesta_imageinfo_a_lista_con_credito():
    data = {"query": {"pages": {"1": {"title": "File:Keddie Cabin 28.jpg", "imageinfo": [{
        "mime": "image/jpeg", "width": 3264, "height": 2448,
        "thumburl": "https://up/thumb/1280px-Keddie_Cabin_28.jpg?utm_source=x",
        "extmetadata": {"Artist": {"value": "<a href='x'>Jane</a>"},
                        "LicenseShortName": {"value": "CC BY-SA 3.0"}}}]}}}}
    (im,) = stock.article_images_from_response(data)
    assert im["url"] == "https://up/thumb/1280px-Keddie_Cabin_28.jpg"
    assert im["credit"] == "«Keddie Cabin 28» (Jane, CC BY-SA 3.0)"


def test_ass_lleva_titular_y_marca_todo_el_clip(tmp_path):
    out = build_ass([Word(0.0, 0.5, "Hola")], tmp_path / "c.ass",
                    caption={"hook_frac": 0.8, "hook_wrap": 18, "hook_margin": 150},
                    target_width=1080, target_height=1920, clip_duration=40.0,
                    hook_text="Keddie 1981: La familia desaparecida", brand_text="Misterios en 60 Segundos")
    ass = out.read_text(encoding="utf-8")
    assert r"Hook,,0,0,0,,KEDDIE 1981: LA\NFAMILIA\NDESAPARECIDA" in ass
    assert ",Marca,,0,0,0,,MISTERIOS EN 60 SEGUNDOS" in ass
    assert "0:00:40.00,Hook" in ass and "0:00:40.00,Marca" in ass


def test_ass_sin_titular_no_cambia(tmp_path):
    out = build_ass([Word(0.0, 0.5, "Hola")], tmp_path / "c.ass", caption={},
                    target_width=1080, target_height=1920, clip_duration=40.0)
    ass = out.read_text(encoding="utf-8")
    assert ",Hook,," not in ass and ",Marca,," not in ass
