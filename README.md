# Magic Ice Stack — dorada igre

Igriva browser igra za Magic Ice s originalnim logotipom i pingvinom. Fokus ove dorade je sama igra; skeniranje računa, promo kodovi, nagrade i prijava kupaca ostaju za sljedeću fazu.

## Šta je novo

- Isti uspravni prostor za igru na mobitelu i računalu, bez rastezanja kuglica.
- Odbrojavanje 3–2–1 s velikim pingvinom i porukama koje se mijenjaju; pingvin se pojavljuje i na rezultatu s čestitkom.
- Runda kreće s 35 sekundi i 3 života. Nasumični satić daje +2 sekunde, najviše dva puta: runda traje najviše 39 sekundi.
- Mirniji početak, postepeno brži pad, promjenjivi razmaci i brzine te nasumični redoslijed kuglica i bonusa.
- Prst se može pomicati bilo gdje po platnu: kornet prati pomak, bez skakanja pod prst pri prvom dodiru. Miš, strelice i A/D ostaju podržani.
- Hvatanje kuglice: osnovnih 100 + 0–25 bodova ovisno o udaljenosti od sredine. Preciznost se boduje u pojedinačnim bodovima, što smanjuje broj jednakih rezultata.
- Svakih 5 uspješnih hvatanja u nizu: dodatnih 200 bodova. Gubitak života prekida niz. Propušteni voćni bonus ne odnosi život.
- Zlatna kuglica 500 (još do +25 za preciznost), voće 150. Voće ima veći prikaz, ružičasti sjaj i oznaku +150; satić ima tirkizni prikaz i oznaku +2 s. Otopljena kuglica ili promašena obična/zlatna kuglica odnose život. Propušteno voće i satić ne kažnjavaju se. Satić ne donosi bodove i ne mijenja niz.
- Kuglica ima kratak zvuk spuštanja, voće zvonki troton, a dodatno vrijeme zasebnu uzlaznu melodiju. Posljednjih 5 sekundi ima tih zvučni signal. Zvuk se može isključiti.
- Mekši doskoci, njihanje tornja pri pomicanju, čestice, istaknute poruke, različiti zvukovi i reakcije pingvina.
- Pregled preostalog vremena, broja kuglica i napretka prema sljedećem bonusu.
- Pauza tipkom, razmakom ili Escapeom; automatska pauza pri napuštanju prozora.
- Rezultat prikazuje precizna hvatanja, najbolji niz, voćne i zlatne bonuse, dodatne sekunde i razradu osvojenih bodova.
- Automatsko privatno spremanje završene runde i osobnog rekorda za isti preglednik. Identifikator preglednika je HttpOnly kolačić; rezultat se čuva na serveru. Ovo nije korisnički račun niti dokaz identiteta.
- Dobrovoljna objava nadimka na zajedničkoj dnevnoj, tjednoj i ukupnoj ljestvici. Svaki nadimak prikazuje svoj najbolji rezultat unutar odabranog razdoblja. Razlike u velikim slovima i višestrukim razmacima spajaju se. Sve izvorne runde ostaju u bazi, bez promjene bodova ili verzije pravila. Početno je odabrano „Ukupno”; okvir prikazuje približno pet redaka, a ostali su dostupni skrolanjem, dodirom ili tipkovnicom. Nadimak i dalje nije potvrđen identitet osobe.
- Kartica za dijeljenje 1080 × 1350 i Story 1080 × 1920, s čistim prikazom tornja bez padajućih predmeta. Izravno dijeljenje ovisi o podršci preglednika; alternativa je preuzimanje.
- Isključenje zvuka, smanjeno kretanje prema postavci uređaja, jasne poruke kod nedostupne mreže i ponovni pokušaj spremanja.

## Bodovanje i postojeći podaci

Nova pravila imaju oznaku 3. Ljestvica uspoređuje samo runde s tim pravilima. Stare runde nisu izbrisane. Osobni rekord također se računa zasebno za novu verziju.

Prve tri kuglice su obične. Dalje se nasumično miješaju grupe od šest običnih kuglica, jedne zlatne, jedne otopljene i dva voćna bonusa. Satić se može pojaviti nakon 8 sekundi; dva pojavljivanja odvojena su barem 6 sekundi i ne pojavljuje se u posljednje 4 sekunde. Položaj, brzina i razmak također ovise o nasumičnom početnom broju koji server čuva. Nasumičnost i preciznost daju raznovrsnije rezultate, ali jednaki rezultati i dalje su mogući. Ovo je zabavna slobodna igra; usporedivost staza, pravilo izjednačenja, prijave, ograničeni pokušaji i zaštita od botova trebaju se definirati zasebno prije nagrada.

Server sam ponavlja poteze i izračunava bodove. Provjerava vlasništvo runde preko kolačića, završetak, trajanje i duplu predaju. Ova provjera ne dokazuje da je igrao čovjek. Automatizirani igrač u razvojnoj provjeri može završiti igru; ovo se ne predstavlja kao zaštita spremna za nagrade.

Njihanje i doskoci su vizualna animacija. Toranj se ne ruši fizički. Okusi na atlasu su ilustrativni.

## Lokalno pokretanje

Potreban je Node.js 22.13 ili noviji:

1. `npm ci`
2. `npm run build`
3. Za novu lokalnu bazu izvršiti obje migracije, redom:
   - `node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_chief_forgotten_one.sql`
   - `node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_redundant_purifiers.sql`
4. `npm run dev`

Migracije ne ponavljati ako su već izvršene. Postojećoj bazi iz prve verzije treba samo migracija 0001. Na ovom računalu obje su već izvršene.

Na Windows računalu gdje npm prečac ne radi koristiti `node "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js" run dev -- --hostname 127.0.0.1`.

Ako izgradnja u ograničenom Windows okruženju prijavi grešku `os.userInfo`, prije izgradnje postaviti `NODE_OPTIONS=--require ./scripts/host-node-compat.cjs`.

## Provjere

`node scripts/check-leaderboard.mjs` provjerava najbolji rezultat po nadimku, velika slova i dijakritiku, izjednačenja, dnevni/tjedni filter prije grupiranja, više od deset nadimaka, isključenje privatnih/nedovršenih/starih rundi i očuvanje svih izvornih zapisa.

Provjere obuhvaćaju bodove za svaku vrstu hvatanja i različite udaljenosti od sredine, niz i reset niza, tri života, granice poteza, kasno hvatanje satića, ograničenje na 39 sekundi i 100 determinističkih ponavljanja. U 80 različitih simuliranih rundi provjeravaju se raznovrsnost redoslijeda i produžene runde.

Lokalne serverske provjere pokrivaju pokretanje, odbijanje prerane predaje i tuđe runde, privatno automatsko spremanje, čitanje osobnog rekorda, dobrovoljnu objavu, duplu predaju i sva tri razdoblja ljestvice. Testni javni rezultat uklonjen je nakon provjere.

U pregledniku su pregledani početni ekran na velikom i mobilnom prikazu, pokretanje, odbrojavanje, pauza, završetak runde i prikaz spremljenog osobnog rekorda. Fizički Android/iPhone i izravno dijeljenje u njihove aplikacije još trebaju praktičnu provjeru. Dobar osjećaj težine igre treba potvrditi s nekoliko stvarnih igrača.

## Objavljivanje i grafike

Igra je objavljena na Sites / Cloudflare Workers s D1 vezom DB: https://magic-ice-igrica.pekibmw.chatgpt.site . Svaka dorada objavljuje se nakon provjera. Publika objave ostaje kako ju je vlasnik postavio.

`public/assets/logo.png` i `public/assets/penguin.png` su originali koje je korisnik dostavio. Stranica koristi njihove manje WebP kopije: `logo-web.webp` (1024 × 1024) i `penguin-web.webp` (768 × 768), uz isti izrez. Originali ostaju netaknuti. Kopije se mogu obnoviti s `node scripts/optimize-game-assets.mjs` uz instaliran Sharp. `public/assets/ice-cream-sprite-atlas.png` je prethodno napravljen ImageGen atlas: jagoda, vanilija, čokolada, zlatna kuglica, kornet i otopljena kuglica.

## Glatkoća animacije

Tokom igre svira originalna, tiha melodija (`public/assets/magic-ice-theme.wav`). Počinje nakon odbrojavanja, staje na pauzi, pri skrivanju stranice i završetku runde. Postojeći gumb zvuka gasi muziku i efekte; izbor se pamti za preglednik. Nova runda pokreće melodiju ispočetka. Glazba se reproducira iz jednog unaprijed pripremljenog mono buffera, bez raspoređivanja pojedinačnih nota tokom igre. `node scripts/generate-game-music.mjs` obnavlja snimku; `node scripts/check-game-music.mjs` provjerava reprodukcijski ciklus i audio datoteku. Ako se muzika ne učita, igra i dalje radi.

Simulacija ostaje na 60 koraka u sekundi. Prikaz interpolira položaje između zadnja dva koraka, uključujući kornet, njihanje tornja i padajuće predmete. Vizualni položaji ne ulaze u bodovanje ni serversko ponavljanje. `GAME_VERSION` ostaje 3, a postojeći rezultati ostaju važeći.

Kuglice, voće i satići pripreme se u malim canvas slikama pri učitavanju. HUD se osvježava kada se promijeni sekunda ili događaj, pingvin se ne učitava ponovno pri svakoj reakciji, a pauzirani i završeni prikaz ne crtaju se iznova svakog kadra. Početna dekorativna animacija ograničena je na 30 fps.

`node scripts/check-game-motion.mjs` provjerava interpolaciju na 60/80/90/120 Hz i uz neujednačene vremenske razmake, 100 nepromijenjenih ponavljanja, završni prikaz i novu rundu. To nisu mjerenja na fizičkom iPhoneu: povremena zastajkivanja u Braveu treba ponovno praktično provjeriti na uređaju.
