# Art portfolio site

A one-file static site: **Work** (home + featured paintings), **Shop**, and **About**.
No build step, no server. Open `index.html` in a browser to preview it.

## Edit your content
Everything you'll change is at the top of the `<script>` in `index.html`, under **EDIT YOUR SITE HERE**:

- `ARTIST_NAME`, `EMAIL`
- `PRINT_SHOP`: your print-on-demand storefront URL
- `PRINT_SIZES`: print sizes and prices for 5 × 7 and 12 × 16 paintings
- `PAINTINGS`: title, size, original price (a number, `'sold'`, or `null` = not for sale), `prints` (true/false),

The About text is in the HTML under `<!-- ABOUT -->`.

## Prints (print on demand)
1. Upload each painting to your print service (Printful, Gelato, Fine Art America, Etsy + Printify…).
   Use your **original high-res photos** for printing, not the web-sized files in `images/`.
2. Paste each product link into that painting's `printUrl`.
   Until you do, "Buy a print" emails you instead.

## Originals
"Inquire" on an original opens an email to you. To take card payments directly, make a Stripe Payment Link
per painting and swap it in for `originalLink()` in the script.

## Adding a painting
Add `images/<id>.jpg` (about 1600px on the long side) and `images/<id>-sm.jpg` (about 800px),
then add an entry to `PAINTINGS` with that `id`.

## Publish
Drag the `art-portfolio` folder into Netlify Drop (app.netlify.com/drop), or push it to its own
GitHub repo and turn on GitHub Pages.
