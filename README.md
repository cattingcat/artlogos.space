# Artlogos

Персональная страница художника на React, TypeScript и Vite.

```sh
npm install
npm run dev
```

`npm run build` проверяет TypeScript и собирает сайт в `dist/`. `npm run preview` открывает собранную версию.

## Docker и CI

GitHub Actions (`.github/workflows/docker.yml`) собирает проект внутри Docker и проверяет запущенный контейнер: HTML, JS/CSS, `/healthz`, кеширование, SPA-маршруты и 404 для отсутствующих файлов. Pull request запускает проверку без публикации. Push в `main`, теги `v*` и ручной запуск workflow на `main` / теге `v*` дополнительно публикуют образ для `linux/amd64` и `linux/arm64` в GHCR.

Образ: `ghcr.io/cattingcat/artlogos.space`. Теги: `latest` для `main`, `sha-<полный SHA коммита>` и имя release-тега. В summary успешного CI есть полный `image@sha256:...`; для ручного деплоя в кластер лучше закреплять этот digest. Образ nginx работает без root на порту **8080**, проверка готовности — **GET /healthz**. Автоматического деплоя в кластер нет.

```sh
docker pull ghcr.io/cattingcat/artlogos.space:latest
docker run --rm -p 8080:8080 ghcr.io/cattingcat/artlogos.space:latest
```

Локальная сборка и проверка:

```sh
docker build -t artlogos:local .
docker run --rm --name artlogos-local -p 8080:8080 artlogos:local
# В другом терминале:
python3 scripts/smoke-test.py http://127.0.0.1:8080
```

Публикация использует встроенный `GITHUB_TOKEN`, отдельные токены в репозитории не нужны. Для скачивания без авторизации GHCR package должен иметь visibility **Public** (она настраивается отдельно от публичности репозитория). Базовые образы Docker и Actions закреплены по digest/SHA; обновлять их нужно явно. `dist/` и `node_modules/` не коммитятся и не отправляются в Docker build context.

## Как заменить контент

- `src/content/site.ts` — имя, описание, контакты, текст «О художнике», публикация. Заполните `email` и `instagram`, чтобы появились реальные контактные ссылки.
- `src/content/artworks.ts` — основная коллекция. `src/content/additionalArtworks.ts` — дополнительные примеры.
- `public/artworks/` и `public/reference/` — картинки. Для своей работы добавьте изображение в `public/artworks/` и запись в массив: `id`, `title`, `category`, `medium`, `price`, `status`, `image`, `artist`, `sourceUrl`. Необязательное `alternateImage` показывает дополнительный ракурс при наведении.
- Категории: `Figures`, `Landscapes`, `Still life`. В `Oil pastels` попадают работы с `medium: 'Oil pastel'`.
- Статусы: `available`, `sold`, `enquire`. Цена задается числом в GBP либо `null`. Для другой валюты измените форматтеры в `App.tsx` и `components/ArtworkDialog.tsx`.
- Оформление: `src/styles.css`.

## Что работает

Категории с адресами, фильтры по технике / доступности / цене, сортировка, просмотр работ в диалоге, листание стрелками, закрытие Escape, возврат фокуса, мобильное меню. История браузера и прямые ссылки `?category=figures&work=...` поддерживаются.

Это фронтенд портфолио. Платежи, учетные записи, отправка форм и CMS не подключены. Контактный email пока пустой; сайт показывает соответствующую подпись. Тексты в `site.ts` — временные.

## Референсы и временные материалы

- https://www.sashamihajlovic.com/category/figures — структура галереи и 13 примеров работ, автор Sasha Mihajlovic.
- https://patricialynchart.co.uk/#publications — типографика и структура публикации, примеры пейзажей / натюрмортов и книга Patricia Lynch.

Изображения принадлежат соответствующим авторам и используются здесь как временный материал локального прототипа по предоставленным референсам. Это не свободная лицензия. Перед публикацией замените их своими материалами или получите разрешение правообладателей; после замены обновите подписи и ссылки авторства. Полный источник основной коллекции — `public/artworks/SOURCES.md`.

Изображения сохранены локально. Шрифты подключаются с Google Fonts; без сети используются Georgia и Arial.
