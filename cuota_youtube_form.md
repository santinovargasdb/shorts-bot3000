# MACHETE COMPLETO — Formulario de cuota YouTube Data API (pasada única)

Form: **https://support.google.com/youtube/contact/yt_api_form**
⚠️ Abrirlo en **INCÓGNITO** logueado con nofaceshortvids@gmail.com y completarlo
de UNA pasada. Subir los archivos AL FINAL, justo antes de Submit.
Archivos listos en **Descargas** (versiones livianas, total 13.2MB).

---

## Section 2 — Organization and Contact

| Campo | Valor |
|---|---|
| Applying as | **As an individual user** |
| Full Legal Name | (tu nombre y apellido del DNI) |
| Organization's Legal Name | `self` |
| Parent Company | `self` |
| Primary Website | `https://santinovargasdb.github.io/shorts-bot3000/` |
| Country / Address | Argentina · Juana Azurduy 5959 · Ciudad Jardín Lomas del Palomar · Buenos Aires · B1684 |
| Category | Media & Entertainment (o similar) |
| Organization Size | **Independent Developer/Sole Proprietor** |
| Primary Contact | tu nombre real + nofaceshortvids@gmail.com |
| Technical/Business Contact | Same as Primary |

## Section 3 — Work & audience

**Describe your organization's work:**
```
I am an individual developer running a small personal automation tool for
my own YouTube channels. I produce original short educational videos in
Spanish (the "60 segundos" family of channels: general facts, history and
mysteries, told in 60-second vertical videos). The videos are generated
locally on my computer with AI voice-over, subtitles and royalty-free
background footage and music (properly credited).

The tool's only interaction with YouTube API Services is uploading these
finished videos (videos.insert) to my own three brand channels, on a fixed
schedule of 2 uploads per channel per day, using OAuth tokens I authorized
myself for my own channels. There are no third-party users: nobody else
uses the tool, it manages no other accounts, it does not read, store or
process any YouTube user data, and it does not display YouTube content
anywhere.

Value provided: as an independent creator, the tool lets me publish
consistent daily educational content in Spanish that viewers can consume
in under a minute. The plan is to scale the same single-user setup to 8-10
niche channels of my own, which is the reason for this quota request. No
existing YouTube functionality is replaced or replicated.
```

- Target audience: **Internal Users** (+ Individual Content Creators si deja varias)
- Monetization: **Free service (we do not charge users)**
- Google representative: **No**
- How did you learn about the API: `Official YouTube developer documentation (developers.google.com)`
- Content Owner IDs / Google Ads IDs: **vacío**

## Section 4 — API Client

| Campo | Valor |
|---|---|
| API Client Name | `En 60 Segundos Uploader` |
| ¿Contiene "YouTube"? | **No** |
| Primary Access URL | `https://santinovargasdb.github.io/shorts-bot3000/` |
| Privacy Policy URL | `https://santinovargasdb.github.io/shorts-bot3000/privacy.html` |
| Terms URL | `https://santinovargasdb.github.io/shorts-bot3000/terms.html` |
| Publicly accessible? | **No** |

**Demo Account Credentials: NO PONER CONTRASEÑAS.** Username/Password/Login
URL vacíos (o `N/A`). En Special Instructions:
```
Not applicable: this API Client is a single-user desktop tool that runs
locally on my own computer. It has no login system, no hosted web app and
no user accounts of any kind — the URL provided is an informational site.
The tool simply uploads my own videos to my own channels via OAuth. I can
provide a screen recording demonstrating the full upload flow on request.
```

## Section 5 — Project & quota

- Projects: **1**
- **Project Number: `927702472633`**
- Use Case Categories: **Video Uploading & Account Management** + **Internal Company Tool**
- OAuth 2.0: **Yes**
- Expected API Usage Volume:
```
Currently ~6 videos.insert calls per day (3 channels x 2 uploads ≈ 9,600
units/day). Scaling to 8-10 of my own channels at 2 uploads/day each:
16-20 calls/day ≈ 26,000-32,000 units. Requesting 50,000 units/day for
videos.insert to cover growth plus retry margin. No other endpoints are
used.
```
- Lista de endpoints: **ninguno marcado** (videos.insert se pide aparte)
- Total quota: **Above Default quota**
- **videos.insert (campo separado): 50,000** · search.list: 0/vacío

## Section 6 — Evidencia (subir AL FINAL)

| Campo | Archivo en Descargas |
|---|---|
| Privacy Policy Screenshots | `privacy-policy-page.pdf` |
| Homepage Screenshot | `homepage-with-policy-links.pdf` |
| Terms of Service Documentation | `terms-of-service-page.pdf` |
| Conditional Evidence (OAuth+CLI) | `evidencia_4_condicional.pdf` |
| Architecture Diagram (opcional) | `architecture-diagram.png` |
| User Flow / Other | vacíos |

## Section 7 — Attestations

Tildar **todas** (son ciertas en este caso de uso) → **Submit**.

Nota post-aprobación: si el caso de uso declarado cambia alguna vez
(dejar de ser single-user), hay que avisar a YouTube por escrito antes.
