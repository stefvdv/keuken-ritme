import { useState, useEffect } from "react";
import {
  ChefHat, Utensils, Layers, Plus, Search, ChevronRight, ArrowLeft, Pencil, X, Check,
  Settings, Download, Share, Smartphone, Info,
  Clock, LogOut, Trash2, Lock, Languages, Loader2, ThumbsUp, Star, GitBranch, Sprout,
  FlaskConical, Blend, Eye, Calendar, Thermometer, Percent
} from "lucide-react";
import { supabase } from "./supabase";

/* In het ritme van het land — receptenboek van Wilde Wortels, Landgoed de Beug (Odijk).
   Biologisch, seizoensgebonden, uit eigen moestuin.
   Basistechnieken die uitwaaieren in variaties per (tuin)ingrediënt, met
   seizoenslabels, fermentatie-batchregistratie, smaakcombinaties, een reken-
   tool per recept en een gastmodus (alleen lezen). Alles origineel. */

/* =====================================================================
   INLOG-INSTELLING — het enige dat je zelf hoeft aan te passen.
   Zet hier per kok het e-mailadres dat je in Supabase hebt aangemaakt
   (Authentication -> Users). Wachtwoorden staan NIET in de code;
   die typt iedere kok zelf in op het inlogscherm.
   ===================================================================== */
const COOK_EMAILS = {
  Michael: "michael@debeug.nl",
  Stef: "stef@debeug.nl",
  Simon: "simon@debeug.nl",
  Isa: "isa@debeug.nl",
  Kim: "kim@debeug.nl",
};

const TEAM = [
  { name: "Michael", role: "Chef" },
  { name: "Stef", role: "Souschef" },
  { name: "Simon", role: "Zelfstandig kok" },
  { name: "Isa", role: "Leerling kok" },
  { name: "Kim", role: "Hulpkok" },
];

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const fill = (str, x) => str.split("{x}").join(x).split("{X}").join(cap(x));

const SEASONS = ["Lente", "Zomer", "Herfst", "Winter"];

// ------- tuinproducten per groep -------
const ROOT = ["rode biet","chioggia biet","gele biet","knolselderij","wortel","pastinaak","aardpeer","meiknol","koolrabi","radijs","ui","utrechtse ui","knoflook"];
const BRASSICA = ["rode kool","savooikool","spitskool","palmkool","boerenkool","chinese kool","paksoi","amsoi"];
const LEAFY = ["snijbiet","andijvie","bindsla","rucola","rode eikenbladsla","ijsbergsla","veldsla","spinazie","amaranth","groenlof","rode melde","tuinzuring"];
const STALK = ["venkel","bleekselderij","kardoen","courgette","komkommer","tomaat"];
const BEAN = ["princessenbonen","sperziebonen","snijbonen","pronkbonen","peultjes","erwten","kapucijners"];
const GFRUIT = ["aardbei","framboos","braam","aalbes","blauwe bes","japanse wijnbes","pruim","reine claude","appel","peer","kweepeer","mispel","druif","rabarber"];
const GHERB = ["bieslook","peterselie","rozemarijn","tijm","laurier","dragon","lavas","munt","citroenmelisse","salie","oregano","koriander","tuinzuring"];
const GFLOWER = ["goudsbloem","korenbloem","dahlia","leeuwenbek","afrikaantjes","oost-indische kers","madelief","kamille","lavendel","courgettebloem"];
const GARDEN_ALL = [...ROOT,...BRASSICA,...LEAFY,...STALK,...BEAN,...GFRUIT,...GHERB,...GFLOWER];

// oude (niet-tuin / voorraad) lijsten, blijven bruikbaar
const FRUIT = ["mango","framboos","passievrucht","aardbei","braam","perzik","abrikoos","kers","bosbes","vijg","granaatappel","rabarber","appel","peer","ananas","mandarijn","bloedsinaasappel","citroen","limoen","yuzu","lychee","banaan","kokos","guave","papaja","meloen","druif","kiwi"];
const VEG = ["knolselderij","wortel","doperwt","bloemkool","pastinaak","pompoen","aardappel","rode biet","zoete aardappel","mais","spinazie","aubergine","courgette","broccoli","venkel","prei","asperge","tomaat"];
const HERB = ["basilicum","bieslook","peterselie","dille","koriander","dragon","munt","kervel","waterkers","zuring"];
const NUT = ["hazelnoot","amandel","pistache","walnoot","pecan","pinda","cashew","macadamia","sesam","zonnebloempit"];
const FRUIT_ONLY = FRUIT.filter((x) => !GARDEN_ALL.includes(x));
const VEG_ONLY = VEG.filter((x) => !GARDEN_ALL.includes(x));
const HERB_ONLY = HERB.filter((x) => !GARDEN_ALL.includes(x));

const SEASON = {
  "komkommer":["Zomer"],"tomaat":["Zomer"],"pruim":["Zomer","Herfst"],"reine claude":["Zomer","Herfst"],
  "aardbei":["Lente","Zomer"],"aalbes":["Zomer"],"braam":["Zomer","Herfst"],"rode kool":["Herfst","Winter"],
  "savooikool":["Herfst","Winter"],"spitskool":["Lente","Zomer"],"koolrabi":["Lente","Zomer","Herfst"],
  "venkel":["Zomer","Herfst"],"snijbiet":["Zomer","Herfst"],"rode biet":["Zomer","Herfst","Winter"],
  "chioggia biet":["Zomer","Herfst","Winter"],"gele biet":["Zomer","Herfst","Winter"],"palmkool":["Herfst","Winter"],
  "boerenkool":["Herfst","Winter"],"andijvie":["Zomer","Herfst"],"bindsla":["Lente","Zomer"],
  "rucola":["Lente","Zomer","Herfst"],"appel":["Herfst","Winter"],"peer":["Herfst","Winter"],
  "japanse wijnbes":["Zomer"],"ui":["Herfst","Winter"],"utrechtse ui":["Lente","Zomer"],
  "bieslook":["Lente","Zomer","Herfst"],"peterselie":["Lente","Zomer","Herfst"],"rozemarijn":["Hele jaar"],
  "tijm":["Hele jaar"],"laurier":["Hele jaar"],"dragon":["Lente","Zomer","Herfst"],"lavas":["Lente","Zomer"],
  "munt":["Lente","Zomer","Herfst"],"citroenmelisse":["Zomer"],"salie":["Lente","Zomer","Herfst"],
  "kweepeer":["Herfst"],"mispel":["Herfst","Winter"],"courgette":["Zomer"],"courgettebloem":["Zomer"],
  "radijs":["Lente","Zomer"],"meiknol":["Lente"],"knolselderij":["Herfst","Winter"],"amaranth":["Zomer"],
  "rode eikenbladsla":["Lente","Zomer","Herfst"],"paksoi":["Lente","Zomer","Herfst"],"goudsbloem":["Zomer","Herfst"],
  "korenbloem":["Zomer"],"dahlia":["Zomer","Herfst"],"leeuwenbek":["Zomer"],"afrikaantjes":["Zomer","Herfst"],
  "kamille":["Zomer"],"lavendel":["Zomer"],"princessenbonen":["Zomer","Herfst"],"sperziebonen":["Zomer","Herfst"],
  "snijbonen":["Zomer","Herfst"],"pronkbonen":["Zomer","Herfst"],"peultjes":["Lente","Zomer"],"erwten":["Lente","Zomer"],
  "kapucijners":["Zomer"],"ijsbergsla":["Zomer"],"veldsla":["Herfst","Winter"],"knoflook":["Zomer","Herfst"],
  "rode melde":["Lente","Zomer"],"rabarber":["Lente"],"framboos":["Zomer","Herfst"],"oregano":["Zomer"],
  "tuinzuring":["Lente","Zomer"],"koriander":["Zomer"],"druif":["Herfst"],"blauwe bes":["Zomer"],
  "wortel":["Zomer","Herfst","Winter"],"pastinaak":["Herfst","Winter"],"aardpeer":["Herfst","Winter"],
  "oost-indische kers":["Zomer","Herfst"],"spinazie":["Lente","Herfst"],"chinese kool":["Herfst"],"amsoi":["Herfst"],
  "kardoen":["Herfst","Winter"],"bleekselderij":["Zomer","Herfst"],"groenlof":["Winter"],"madelief":["Lente","Zomer"],
};
const seasonOf = (m) => SEASON[m] || ["Hele jaar"];

const BASES = [
  // ---- oude basistechnieken (voorraad + tuin overlap) ----
  { id:"mousse", baseName:"Vruchtenmousse", noun:"Mousse", generic:"fruit", category:"Mousses", yield:"≈ 650 g", chefsPick:true, endorsements:["Michael","Stef"], gear:"Thermoblender", mains:FRUIT.slice(0,24),
    ingredients:[{item:"Puree van {x}",amount:"250 g"},{item:"Slagroom",amount:"200 g"},{item:"Suiker",amount:"40 g"},{item:"Gelatineblaadjes",amount:"3 blaadjes"},{item:"Citroensap",amount:"10 g"}],
    steps:["Week de gelatine.","Verwarm een derde van de puree van {x} en los de gelatine op.","Meng met de rest en het citroensap; koel tot lobbig.","Spatel de halfgeslagen room erdoor; 3 uur opstijven."] },
  { id:"gel", baseName:"Vruchtengel", noun:"Gel", generic:"fruit", category:"Gels & sauzen", yield:"≈ 400 g", chefsPick:true, gear:"Thermoblender", mains:FRUIT,
    ingredients:[{item:"Sap/puree van {x}",amount:"400 g"},{item:"Agar-agar",amount:"3 g"},{item:"Suiker",amount:"20 g"}],
    steps:["Kook sap van {x} met agar 2 min.","Laat opstijven en mix glad.","Passeer in een knijpfles."] },
  { id:"sorbet", baseName:"Fruitsorbet", noun:"Sorbet", generic:"fruit", category:"Sorbet & ijs", yield:"≈ 700 g", chefsPick:true, gear:"Sorbetmachine", mains:FRUIT_ONLY,
    ingredients:[{item:"Puree van {x}",amount:"500 g"},{item:"Suikersiroop",amount:"150 g"},{item:"Glucose",amount:"30 g"},{item:"Citroensap",amount:"15 g"}],
    steps:["Meng alles glad.","Rijp 4 uur koud.","Draai in de sorbetmachine; bewaar op -18°C."] },
  { id:"crumble", baseName:"Notencrumble", noun:"Crumble", generic:"noot", category:"Crumbles & garnituur", yield:"≈ 250 g", mains:NUT,
    ingredients:[{item:"{X}, gehakt",amount:"100 g"},{item:"Bloem",amount:"60 g"},{item:"Boter",amount:"60 g"},{item:"Suiker",amount:"40 g"}],
    steps:["Wrijf tot kruimels en meng de {x} erdoor.","Bak 12 min op 170°C.","Laat krokant afkoelen."] },
  { id:"ganache", baseName:"Ganache", generic:"chocolade", category:"Zoet & patisserie", yield:"≈ 420 g", mode:"flavor", chefsPick:true,
    ingredients:[{item:"Chocolade",amount:"200 g"},{item:"Room",amount:"200 g"},{item:"Boter",amount:"20 g"}],
    steps:["Verwarm de room.","Giet over de chocolade en emulgeer.","Roer de boter erdoor."],
    variations:[{name:"Pure ganache"},{name:"Melkchocoladeganache",add:"Iets minder room."},{name:"Witte ganache",add:"Meer chocolade voor stevigheid."},{name:"Koffieganache",add:"Trek de room met koffie."},{name:"Frambozenganache",add:"Deel room vervangen door frambozenpuree.",season:["Zomer","Herfst"]},{name:"Muntganache",add:"Trek met verse munt; zeef.",season:["Lente","Zomer","Herfst"]},{name:"Kweeperenganache",add:"Vervang deel room door kweeperenpuree.",season:["Herfst"]},{name:"Lavendelganache",add:"Trek kort met lavendel.",season:["Zomer"]}] },
  { id:"anglaise", baseName:"Crème anglaise", generic:"vanille", category:"Zoet & patisserie", yield:"≈ 550 g", mode:"flavor", chefsPick:true,
    ingredients:[{item:"Melk",amount:"250 g"},{item:"Room",amount:"250 g"},{item:"Eidooiers",amount:"5 stuks"},{item:"Suiker",amount:"60 g"}],
    steps:["Verwarm melk en room.","Klop dooiers met suiker; bind tot 82°C.","Passeer en koel snel."],
    variations:[{name:"Vanille-anglaise",add:"Trek met vanille."},{name:"Koffie-anglaise",add:"Trek met koffie."},{name:"Citroenmelisse-anglaise",add:"Trek met citroenmelisse uit de tuin.",season:["Zomer"]},{name:"Laurier-anglaise",add:"Trek kort met verse laurier."},{name:"Salie-anglaise",add:"Trek met salie.",season:["Lente","Zomer","Herfst"]},{name:"Kamille-anglaise",add:"Trek met kamillebloemen.",season:["Zomer"]}] },
  { id:"icecream", baseName:"Roomijs", generic:"vanille", category:"Sorbet & ijs", yield:"≈ 900 g", mode:"flavor", chefsPick:true, gear:"Sorbetmachine",
    ingredients:[{item:"Melk",amount:"500 g"},{item:"Room",amount:"250 g"},{item:"Eidooiers",amount:"6 stuks"},{item:"Suiker",amount:"150 g"}],
    steps:["Maak een anglaise (82°C).","Rijp 12 uur.","Draai in de sorbetmachine."],
    variations:[{name:"Vanille-roomijs",add:"Trek met vanille."},{name:"Karamel-roomijs",add:"Deel suiker vervangen door karamel."},{name:"Hazelnoot-roomijs",add:"Roer pralinépasta erdoor."},{name:"Braam-roomijs",add:"Roer braampuree door de gerijpte basis.",season:["Zomer","Herfst"]},{name:"Aardbei-roomijs",add:"Roer aardbeienpuree erdoor.",season:["Lente","Zomer"]},{name:"Rabarber-roomijs",add:"Roer rabarbercompote erdoor.",season:["Lente"]},{name:"Honing-tijm-roomijs",add:"Zoet met honing en trek met tijm."}] },
  { id:"caramel", baseName:"Karamel", generic:"karamel", category:"Zoet & patisserie", yield:"≈ 350 g", mode:"flavor",
    ingredients:[{item:"Suiker",amount:"200 g"},{item:"Room",amount:"150 g"},{item:"Boter",amount:"40 g"}],
    steps:["Smelt de suiker amberkleurig.","Blus met warme room.","Roer de boter erdoor."],
    variations:[{name:"Klassieke karamel"},{name:"Gezouten karamel",add:"Werk af met fleur de sel."},{name:"Miso-karamel",add:"Roer witte miso erdoor."},{name:"Butterscotch",add:"Bruine suiker en extra boter."}] },
  { id:"beurreblanc", baseName:"Beurre blanc", generic:"boter", category:"Sauzen & emulsies", yield:"≈ 300 g", mode:"flavor", chefsPick:true, endorsements:["Michael"],
    ingredients:[{item:"Sjalot",amount:"1 stuk"},{item:"Witte wijn",amount:"100 g"},{item:"Azijn",amount:"50 g"},{item:"Koude boter",amount:"200 g"}],
    steps:["Reduceer tot bijna droog.","Monteer koude boter buiten het vuur.","Passeer; niet koken."],
    variations:[{name:"Klassieke beurre blanc"},{name:"Dille-beurre blanc",add:"Roer dille erdoor."},{name:"Dragon-beurre blanc",add:"Roer dragon erdoor.",season:["Lente","Zomer","Herfst"]},{name:"Beurre rouge",add:"Rode wijn i.p.v. witte."},{name:"Mosterd-beurre blanc",add:"Lepel mosterd erdoor."}] },
  { id:"mayo", baseName:"Emulsie / mayonaise", generic:"emulsie", category:"Sauzen & emulsies", yield:"≈ 300 g", mode:"flavor", chefsPick:true,
    ingredients:[{item:"Eidooier",amount:"1 stuk"},{item:"Mosterd",amount:"10 g"},{item:"Neutrale olie",amount:"250 g"},{item:"Azijn",amount:"10 g"}],
    steps:["Klop dooier met mosterd.","Druppel de olie erbij.","Op smaak met azijn."],
    variations:[{name:"Klassieke mayonaise"},{name:"Aioli",add:"Knoflook uit de tuin."},{name:"Bieslookmayonaise",add:"Fijne bieslook erdoor.",season:["Lente","Zomer","Herfst"]},{name:"Mosterdmayonaise",add:"Extra grove mosterd."},{name:"Sojasaus-mayonaise",add:"Werk af met sojasaus."},{name:"Oost-Indische-kersmayonaise",add:"Roer fijne blaadjes erdoor voor peperigheid.",season:["Zomer","Herfst"]}] },
  { id:"vinaigrette", baseName:"Vinaigrette", generic:"vinaigrette", category:"Oliën & vinaigrettes", yield:"≈ 150 g", mode:"flavor",
    ingredients:[{item:"Azijn",amount:"30 g"},{item:"Olie",amount:"90 g"},{item:"Mosterd",amount:"5 g"}],
    steps:["Klop azijn met mosterd en zout.","Monteer met olie."],
    variations:[{name:"Klassieke vinaigrette"},{name:"Sjalottenvinaigrette",add:"Fijne sjalot erdoor."},{name:"Honing-mosterdvinaigrette",add:"Honing toevoegen."},{name:"Dragonvinaigrette",add:"Dragon erdoor.",season:["Lente","Zomer","Herfst"]},{name:"Frambozenvinaigrette",add:"Frambozenazijn + wat puree.",season:["Zomer","Herfst"]}] },
  { id:"jus", baseName:"Jus / reductie", generic:"jus", category:"Sauzen & emulsies", yield:"≈ 400 g", mode:"flavor", endorsements:["Michael","Stef"],
    ingredients:[{item:"Fond",amount:"1 l"},{item:"Rode wijn",amount:"200 g"},{item:"Sjalot",amount:"2 stuks"},{item:"Boter",amount:"30 g"}],
    steps:["Reduceer wijn met sjalot.","Voeg fond toe; reduceer napperend.","Monteer met boter; passeer."],
    variations:[{name:"Rodewijnjus"},{name:"Portjus",add:"Port toevoegen."},{name:"Tijm-knoflookjus",add:"Trek met tijm en knoflook."},{name:"Peperjus",add:"Gebroken peper."}] },
  { id:"tuile", baseName:"Tuile", generic:"tuile", category:"Krokant & garnituur", yield:"≈ 12 tuiles", mode:"flavor",
    ingredients:[{item:"Bloem",amount:"50 g"},{item:"Boter",amount:"50 g"},{item:"Suiker/Parmezaan",amount:"50 g"},{item:"Eiwit",amount:"50 g"}],
    steps:["Meng glad.","Strijk dun uit.","Bak 6–8 min op 170°C; vorm warm."],
    variations:[{name:"Parmezaantuile"},{name:"Broodtuile",add:"Broodkruim i.p.v. bloem."},{name:"Sesamtuile",add:"Sesam erover."},{name:"Boekweittuile",add:"Deel boekweit."}] },

  // ---- TUIN: bereiden ----
  { id:"roast", baseName:"Geroosterde tuingroente", varTemplate:"Geroosterde {x}", generic:"tuingroente", category:"Tuin · geroosterd", yield:"4 porties", chefsPick:true, endorsements:["Michael","Simon"], gear:"Combi-oven / iVario",
    mains:[...ROOT,"venkel","bleekselderij","kardoen","courgette","tomaat",...BRASSICA,"princessenbonen","sperziebonen","snijbonen","pronkbonen"],
    ingredients:[{item:"{X}",amount:"800 g"},{item:"Olijfolie",amount:"3 el"},{item:"Zout",amount:"naar smaak"},{item:"Tijm",amount:"enkele takjes"}],
    steps:["Maak de {x} schoon en snijd in gelijke stukken.","Meng met olie, zout en tijm.","Rooster op 200°C tot gaar en gekaramelliseerd."] },
  { id:"grill", baseName:"Gegrilde tuingroente", varTemplate:"Gegrilde {x}", generic:"tuingroente", category:"Tuin · gegrild", yield:"4 porties", gear:"Black Bastard",
    mains:[...ROOT,...STALK,"spitskool","palmkool","savooikool"],
    ingredients:[{item:"{X}",amount:"600 g"},{item:"Olie",amount:"2 el"},{item:"Zout",amount:"naar smaak"}],
    steps:["Grill de {x} op de Black Bastard tot mooie strepen.","Gaar door aan de koele kant of in de combi-oven.","Maak af met zout en olie."] },
  { id:"steam", baseName:"Gestoomde tuingroente", varTemplate:"Gestoomde {x}", generic:"tuingroente", category:"Tuin · gestoomd", yield:"4 porties", gear:"Combi-oven",
    mains:[...ROOT.slice(0,10),"venkel","bleekselderij","kardoen","courgette",...BRASSICA.slice(0,4)],
    ingredients:[{item:"{X}",amount:"500 g"},{item:"Zout",amount:"een snuf"}],
    steps:["Stoom de {x} beetgaar in de combi-oven.","Schrik indien nodig.","Breng op smaak."] },
  { id:"gpuree", baseName:"Tuinpuree", noun:"Puree", generic:"tuingroente", category:"Purees", yield:"≈ 500 g", chefsPick:true, endorsements:["Stef","Kim"], gear:"Thermoblender",
    mains:[...ROOT,...BRASSICA,"spinazie",...STALK],
    ingredients:[{item:"{X}",amount:"500 g"},{item:"Boter",amount:"50 g"},{item:"Room of bouillon",amount:"150 g"},{item:"Zout",amount:"naar smaak"}],
    steps:["Gaar de {x} zacht.","Mix in de thermoblender tot zijdezacht.","Breng op smaak en passeer."] },
  { id:"gpickle", baseName:"Tuinpickle", varTemplate:"Gepekelde {x}", generic:"tuingroente", category:"Pickles & zuur", yield:"≈ 400 g", chefsPick:true, gear:"Robot Coupe snijder",
    mains:[...ROOT,...STALK,...BEAN,"rode kool","spitskool"],
    ingredients:[{item:"{X}",amount:"400 g"},{item:"Azijn",amount:"200 g"},{item:"Suiker",amount:"80 g"},{item:"Zout",amount:"8 g"}],
    steps:["Snijd de {x} op de Robot Coupe.","Kook de pekel en giet over de {x}.","Laat minimaal 1 uur trekken."] },
  { id:"gchip", baseName:"Tuinchips", varTemplate:"Chip van {x}", generic:"tuingroente", category:"Krokant & garnituur", yield:"≈ 20 chips", gear:"Droogoven / iVario",
    mains:[...ROOT,"palmkool","boerenkool","courgette"],
    ingredients:[{item:"Dunne plakjes {x}",amount:"1 stuk"},{item:"Zout",amount:"naar smaak"}],
    steps:["Snijd flinterdun.","Droog in de droogoven of frituur krokant in de iVario.","Zout licht."] },
  { id:"gespuma", baseName:"Tuin-espuma", noun:"Espuma", generic:"tuingroente", category:"Schuim & espuma", yield:"1 sifon", gear:"Sifon",
    mains:["rode biet","chioggia biet","gele biet","knolselderij","wortel","pastinaak","aardpeer","meiknol","koolrabi","ui","knoflook","erwten","venkel","bleekselderij"],
    ingredients:[{item:"Puree van {x}",amount:"400 g"},{item:"Room",amount:"100 g"},{item:"Gelatineblaadje",amount:"1 blaadje"}],
    steps:["Meng warme puree van {x} met room en gelatine.","Passeer en vul een sifon; 2 patronen.","Koel 2 uur; schud voor gebruik."] },
  { id:"ggel", baseName:"Tuingel", noun:"Gel", generic:"tuingroente", category:"Gels & sauzen", yield:"≈ 400 g", gear:"Thermoblender",
    mains:["rode biet","chioggia biet","gele biet","knolselderij","wortel","pastinaak","aardpeer","meiknol","koolrabi","ui","venkel","bleekselderij","courgette","komkommer","tomaat"],
    ingredients:[{item:"Sap van {x}",amount:"400 g"},{item:"Agar-agar",amount:"3 g"},{item:"Zout",amount:"snuf"}],
    steps:["Kook sap van {x} met agar 2 min.","Laat opstijven en mix glad.","Passeer in een knijpfles."] },
  { id:"gconfit", baseName:"Geconfijte tuingroente", varTemplate:"Geconfijte {x}", generic:"tuingroente", category:"Tuin · confit", yield:"naar behoefte",
    mains:["knoflook","ui","utrechtse ui","tomaat","rode biet","aardpeer","meiknol"],
    ingredients:[{item:"{X}",amount:"naar behoefte"},{item:"Olijfolie",amount:"om onder te dompelen"},{item:"Tijm & laurier",amount:"naar smaak"}],
    steps:["Dompel de {x} onder in olie met aromaten.","Gaar langzaam op 80–90°C tot zacht.","Bewaar in de olie."] },
  { id:"gsmoke", baseName:"Gerookte tuingroente", varTemplate:"Gerookte {x}", generic:"tuingroente", category:"Tuin · gerookt", yield:"naar behoefte", gear:"Black Bastard",
    mains:[...ROOT,"rode kool","boerenkool"],
    ingredients:[{item:"{X}",amount:"naar behoefte"},{item:"Rookmot",amount:"1 handvol"}],
    steps:["Rook de {x} koud of warm op de Black Bastard.","Laat rusten zodat de rook zich zet.","Bewaar afgedekt."] },
  { id:"gtartaar", baseName:"Groentetartaar", varTemplate:"Tartaar van {x}", generic:"tuingroente", category:"Tuin · rauw", yield:"4 porties",
    mains:["rode biet","tomaat","courgette","koolrabi","radijs","chioggia biet"],
    ingredients:[{item:"{X}, brunoise",amount:"300 g"},{item:"Sjalot",amount:"1 stuk"},{item:"Mosterd & olie",amount:"naar smaak"},{item:"Bieslook",amount:"1 el"}],
    steps:["Snijd de {x} in fijne brunoise.","Meng met sjalot, mosterd, olie en bieslook.","Breng op smaak en dresseer met een ring."] },
  { id:"gcarp", baseName:"Groentecarpaccio", varTemplate:"Carpaccio van {x}", generic:"tuingroente", category:"Tuin · rauw", yield:"4 porties",
    mains:["rode biet","chioggia biet","gele biet","koolrabi","meiknol","pastinaak","courgette"],
    ingredients:[{item:"{X}",amount:"300 g"},{item:"Olijfolie",amount:"2 el"},{item:"Zout & peper",amount:"naar smaak"}],
    steps:["Snijd de {x} flinterdun op de snijmachine.","Leg dakpansgewijs op het bord.","Maak af met olie, zout en kruiden."] },
  { id:"gbouillon", baseName:"Groentebouillon", noun:"Bouillon", generic:"tuingroente", category:"Fonds & bouillon", yield:"≈ 1 l",
    mains:ROOT.slice(0,10),
    ingredients:[{item:"{X}",amount:"400 g"},{item:"Ui & prei",amount:"200 g"},{item:"Water",amount:"1,5 l"},{item:"Kruiden",amount:"bouquet"}],
    steps:["Snijd de {x} grof.","Trek 45 min tegen de kook aan.","Zeef en breng op smaak."] },

  // ---- TUIN: kruiden & bloemen ----
  { id:"gherboil", baseName:"Kruidenolie", varTemplate:"Olie van {x}", generic:"kruid", category:"Oliën & vinaigrettes", yield:"≈ 250 g", chefsPick:true, gear:"Thermoblender",
    mains:GHERB,
    ingredients:[{item:"{X}",amount:"100 g"},{item:"Neutrale olie",amount:"250 g"}],
    steps:["Blancheer de {x} kort en dep droog.","Mix met olie tot 70°C.","Laat uitlekken door een doek."] },
  { id:"gsalt", baseName:"Kruidenzout", varTemplate:"Zout van {x}", generic:"kruid", category:"Kruiden & zout", yield:"≈ 220 g", gear:"Droogoven",
    mains:[...GHERB,"lavendel","goudsbloem"],
    ingredients:[{item:"{X}",amount:"40 g"},{item:"Grof zeezout",amount:"200 g"}],
    steps:["Droog de {x} in de droogoven.","Vermaal met het zout.","Bewaar droog en afgesloten."] },
  { id:"gbutter", baseName:"Kruidenboter", varTemplate:"Boter van {x}", generic:"kruid", category:"Zuivel", yield:"≈ 280 g",
    mains:GHERB.filter((h) => h !== "laurier"),
    ingredients:[{item:"Zachte boter",amount:"250 g"},{item:"{X}, fijn",amount:"30 g"},{item:"Zout",amount:"snuf"}],
    steps:["Meng de zachte boter met de {x} en zout.","Rol op in folie.","Koel tot stevig."] },
  { id:"gpesto", baseName:"Pesto", varTemplate:"Pesto van {x}", generic:"kruid", category:"Sauzen & emulsies", yield:"≈ 300 g",
    mains:["bieslook","peterselie","dragon","lavas","munt","oregano","koriander","tuinzuring"],
    ingredients:[{item:"{X}",amount:"80 g"},{item:"Pompoenpit of amandel",amount:"30 g"},{item:"Kaas",amount:"40 g"},{item:"Olijfolie",amount:"120 g"}],
    steps:["Rooster de pitten.","Mix {x}, pitten en kaas grof.","Monteer met olie; op smaak."] },
  { id:"gherbgel", baseName:"Kruidengel", noun:"Gel", generic:"kruid", category:"Gels & sauzen", yield:"≈ 300 g", gear:"Thermoblender",
    mains:GHERB.slice(0,10),
    ingredients:[{item:"Sap of aftreksel van {x}",amount:"300 g"},{item:"Agar-agar",amount:"3 g"}],
    steps:["Kook het sap of aftreksel van {x} met agar 2 min.","Opstijven en glad mixen.","Passeer in een knijpfles."] },
  { id:"fvinegar", baseName:"Bloemenazijn", varTemplate:"Azijn van {x}", generic:"bloem", category:"Oliën & vinaigrettes", yield:"≈ 300 g",
    mains:GFLOWER,
    ingredients:[{item:"{X}",amount:"30 g"},{item:"Witte-wijnazijn",amount:"300 g"}],
    steps:["Doe de {x} in de azijn.","Laat 2 weken op een donkere plek trekken.","Zeef en bottel."] },
  { id:"pflower", baseName:"Gepekelde bloemen", varTemplate:"Gepekelde {x}", generic:"bloem", category:"Pickles & zuur", yield:"≈ 150 g",
    mains:GFLOWER,
    ingredients:[{item:"{X}",amount:"50 g"},{item:"Rijstazijn",amount:"100 g"},{item:"Suiker",amount:"30 g"},{item:"Zout",amount:"3 g"}],
    steps:["Breng de pekel aan de kook en laat afkoelen.","Leg de {x} onder de pekel.","Laat minimaal 1 dag trekken."] },
  { id:"candyflower", baseName:"Gekonfijte bloemen", varTemplate:"Gekonfijte {x}", generic:"bloem", category:"Zoet & patisserie", yield:"naar behoefte", gear:"Droogoven",
    mains:GFLOWER.filter((f) => f !== "courgettebloem"),
    ingredients:[{item:"{X}",amount:"20 g"},{item:"Eiwit",amount:"1 stuk"},{item:"Fijne suiker",amount:"100 g"}],
    steps:["Bestrijk de {x} dun met eiwit.","Bestrooi met suiker.","Droog in de droogoven tot krokant."] },

  // ---- TUIN: fruit ----
  { id:"gsorbet", baseName:"Tuinsorbet", noun:"Sorbet", generic:"tuinfruit", category:"Sorbet & ijs", yield:"≈ 700 g", chefsPick:true, gear:"Sorbetmachine",
    mains:GFRUIT,
    ingredients:[{item:"Puree van {x}",amount:"500 g"},{item:"Suikersiroop",amount:"150 g"},{item:"Glucose",amount:"30 g"},{item:"Citroensap",amount:"15 g"}],
    steps:["Mix alles glad.","Draai in de sorbetmachine.","Bewaar op -18°C."] },
  { id:"gcompote", baseName:"Tuincompote", noun:"Compote", generic:"tuinfruit", category:"Compotes & jam", yield:"≈ 400 g",
    mains:GFRUIT,
    ingredients:[{item:"{X}",amount:"400 g"},{item:"Suiker",amount:"80 g"},{item:"Citroensap",amount:"10 g"}],
    steps:["Wel de {x} met suiker.","Laat zachtjes inkoken tot compote.","Op smaak met citroen; koel."] },
  { id:"gjam", baseName:"Tuinconfituur", noun:"Confituur", generic:"tuinfruit", category:"Compotes & jam", yield:"≈ 3 potten",
    mains:GFRUIT,
    ingredients:[{item:"{X}",amount:"500 g"},{item:"Geleisuiker",amount:"500 g"},{item:"Citroensap",amount:"20 g"}],
    steps:["Kook de {x} met geleisuiker.","4 min doorkoken; test op koud bordje.","Vul potten heet af."] },
  { id:"gcoulis", baseName:"Tuincoulis", noun:"Coulis", generic:"tuinfruit", category:"Gels & sauzen", yield:"≈ 350 g",
    mains:GFRUIT,
    ingredients:[{item:"Puree van {x}",amount:"300 g"},{item:"Poedersuiker",amount:"40 g"},{item:"Citroensap",amount:"10 g"}],
    steps:["Mix alles glad.","Op smaak; verdun voor een lopende saus.","Passeer en koel."] },
  { id:"gdry", baseName:"Gedroogd fruitpoeder", varTemplate:"Poeder van {x}", generic:"tuinfruit", category:"Krokant & garnituur", yield:"≈ 60 g", gear:"Droogoven",
    mains:GFRUIT,
    ingredients:[{item:"Puree van {x}",amount:"300 g"}],
    steps:["Strijk dun uit op een mat.","Droog op 60°C tot leerachtig.","Maal tot poeder; bewaar droog."] },
  { id:"gpoach", baseName:"Gepocheerd tuinfruit", varTemplate:"Gepocheerde {x}", generic:"tuinfruit", category:"Fruit & garnituur", yield:"4 porties",
    mains:["peer","appel","pruim","reine claude","kweepeer","mispel","rabarber","druif"],
    ingredients:[{item:"{X}",amount:"400 g"},{item:"Water",amount:"500 g"},{item:"Suiker",amount:"200 g"},{item:"Laurier",amount:"1 blad"}],
    steps:["Breng de siroop aan de kook.","Pocheer de {x} zacht.","Laat afkoelen in de siroop."] },

  // ---- TUIN: bonen ----
  { id:"beanpuree", baseName:"Bonenpuree", noun:"Puree", generic:"bonen", category:"Purees", yield:"≈ 400 g", gear:"Thermoblender",
    mains:BEAN,
    ingredients:[{item:"{X}",amount:"400 g"},{item:"Olijfolie",amount:"40 g"},{item:"Knoflook",amount:"1 teen"},{item:"Zout",amount:"naar smaak"}],
    steps:["Gaar de {x} zacht.","Mix met olie en knoflook glad.","Breng op smaak."] },
  { id:"beanroast", baseName:"Geroosterde bonen", varTemplate:"Geblisterde {x}", generic:"bonen", category:"Tuin · geroosterd", yield:"4 porties", gear:"iVario",
    mains:BEAN,
    ingredients:[{item:"{X}",amount:"400 g"},{item:"Olie",amount:"2 el"},{item:"Zout",amount:"naar smaak"}],
    steps:["Blancheer de {x} kort.","Blister heet in de iVario met olie.","Maak af met zout en kruiden."] },

  // ---- FERMENTATIE ----
  { id:"lacto", baseName:"Melkzuurgefermenteerde groente", varTemplate:"Gefermenteerde {x}", generic:"tuingroente", category:"Fermentatie", yield:"1 pot", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:2.5,tempC:20,days:10}, chefsPick:true, endorsements:["Simon","Stef"], gear:"Fermentatiemateriaal",
    mains:[...ROOT,...BRASSICA,...STALK],
    ingredients:[{item:"{X}",amount:"1 kg"},{item:"Zout (2,5%)",amount:"25 g"},{item:"Water (indien nodig)",amount:"naar behoefte"}],
    steps:["Weeg de {x} en 2,5% zout af.","Kneus of meng tot vocht vrijkomt; pak strak in onder de pekel.","Ferment 7–14 dagen op ±20°C; proef en koel bij de gewenste zuurte."] },
  { id:"kraut", baseName:"Zuurkoolstijl", varTemplate:"Zuurkool van {x}", generic:"kool", category:"Fermentatie", yield:"1 pot", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:2.5,tempC:20,days:21}, gear:"Fermentatiemateriaal",
    mains:BRASSICA,
    ingredients:[{item:"{X}, gesneden",amount:"1 kg"},{item:"Zout (2,5%)",amount:"25 g"}],
    steps:["Snijd de {x} fijn en meng met 2,5% zout.","Kneed tot er pekel vrijkomt en stamp aan onder het vocht.","Ferment 2–4 weken op ±20°C; koel bij gewenste zuurte."] },
  { id:"kimchi", baseName:"Kimchi-stijl", varTemplate:"Kimchi van {x}", generic:"kool", category:"Fermentatie", yield:"1 pot", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:2.5,tempC:20,days:5}, gear:"Fermentatiemateriaal",
    mains:["chinese kool","paksoi","amsoi","rode kool","koolrabi","radijs"],
    ingredients:[{item:"{X}",amount:"1 kg"},{item:"Zout",amount:"25 g"},{item:"Kimchipasta (ui, knoflook, gember, chili)",amount:"200 g"}],
    steps:["Zout de {x} en laat 2 uur wellen; spoel en dep.","Meng met de pasta.","Ferment 3–7 dagen op ±20°C; daarna koelen."] },
  { id:"fhot", baseName:"Gefermenteerde hotsauce", varTemplate:"Hotsauce van {x}", generic:"groente", category:"Fermentatie", yield:"≈ 500 g", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:2.5,tempC:22,days:14}, gear:"Fermentatiemateriaal",
    mains:["tomaat","radijs","ui","knoflook","rode biet"],
    ingredients:[{item:"{X} + chili",amount:"500 g"},{item:"Zout (2,5%)",amount:"13 g"}],
    steps:["Mix de {x} met chili en zout.","Ferment 1–2 weken onder pekel op ±22°C.","Mix glad, passeer en bottel; koel."] },
  { id:"fcaper", baseName:"Gefermenteerde bloemknoppen", varTemplate:"Kappertjes van {x}", generic:"bloem", category:"Fermentatie", yield:"1 pot", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:3.5,tempC:20,days:7}, gear:"Fermentatiemateriaal",
    mains:["oost-indische kers","madelief","goudsbloem"],
    ingredients:[{item:"Knoppen van {x}",amount:"200 g"},{item:"Zout (3,5%)",amount:"7 g"},{item:"Water",amount:"200 g"}],
    steps:["Leg de knoppen onder een 3,5% pekel.","Ferment 1–2 weken op ±20°C.","Bewaar in de pekel; gebruik als kappertjes."] },

  // ---- FERMENTATIE: melkzuur (uitbreiding) ----
  { id:"kvass", baseName:"Groentekvass", varTemplate:"Kvass van {x}", generic:"tuingroente", category:"Fermentatie · dranken", yield:"≈ 1,5 l", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:2.5,tempC:20,days:5}, gear:"Fermentatiemateriaal",
    mains:["rode biet","gele biet","chioggia biet","wortel","knolselderij"],
    ingredients:[{item:"{X}, grof gesneden",amount:"500 g"},{item:"Water",amount:"1,5 l"},{item:"Zout (2,5% van totaal)",amount:"50 g"}],
    steps:["Doe de {x} met het water en zout in een pot; alles onder het vocht.","Ferment 3–7 dagen op ±20°C; roer dagelijks even om.","Zeef, proef op zuurte en bottel; bewaar koud en ontlucht de flessen dagelijks."] },
  { id:"dongchimi", baseName:"Waterkimchi (dongchimi-stijl)", varTemplate:"Waterkimchi van {x}", generic:"knolgroente", category:"Fermentatie", yield:"1 pot", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:2.5,tempC:18,days:7}, gear:"Fermentatiemateriaal",
    mains:["meiknol","radijs","chinese kool","koolrabi"],
    ingredients:[{item:"{X}, in parten",amount:"1 kg"},{item:"Water",amount:"1 l"},{item:"Zout (2,5% van totaal)",amount:"50 g"},{item:"Knoflook, gember, ui",amount:"naar smaak"}],
    steps:["Leg de {x} met de aromaten onder de pekel.","Ferment 5–10 dagen op ±18°C tot de pekel licht bruist.","Serveer de groente én de sprankelende pekel ijskoud."] },
  { id:"fstem", baseName:"Gefermenteerde stelen", varTemplate:"Gefermenteerde stelen van {x}", generic:"steelgroente", category:"Fermentatie", yield:"1 pot", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:2.5,tempC:20,days:10}, gear:"Fermentatiemateriaal",
    mains:["snijbiet","bleekselderij","kardoen","paksoi"],
    ingredients:[{item:"Stelen van {x}, in stukken",amount:"500 g"},{item:"Zout (2,5%)",amount:"13 g"},{item:"Water (indien nodig)",amount:"naar behoefte"}],
    steps:["Snijd de stelen van de {x} op maat en weeg 2,5% zout af.","Pak strak in onder de pekel.","Ferment 7–14 dagen op ±20°C; de stelen blijven knapperig."] },
  { id:"fherbpaste", baseName:"Gefermenteerde kruidenpasta", varTemplate:"Kruidenpasta van {x}", generic:"kruid", category:"Fermentatie", yield:"1 potje", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:5,tempC:20,days:14}, gear:"Fermentatiemateriaal",
    mains:["lavas","dragon","koriander","peterselie","bieslook","tuinzuring"],
    ingredients:[{item:"{X}, fijngehakt",amount:"200 g"},{item:"Zout (5%)",amount:"10 g"}],
    steps:["Hak de {x} fijn en kneed met 5% zout tot een natte pasta.","Druk luchtvrij aan in een klein potje.","Ferment 2 weken op ±20°C; daarna koel bewaren als smaakmaker."] },
  { id:"fvat", baseName:"Pekelgroenten uit het vat", varTemplate:"{X} uit het vat", generic:"tuingroente", category:"Fermentatie", yield:"1 pot", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:3.5,tempC:18,days:10}, gear:"Fermentatiemateriaal",
    mains:["komkommer","courgette","meiknol","radijs"],
    ingredients:[{item:"{X}, heel of in stukken",amount:"1 kg"},{item:"Water",amount:"1 l"},{item:"Zout (3,5% van het water)",amount:"35 g"},{item:"Dille, knoflook & een druivenblad",amount:"per pot"}],
    steps:["Leg de {x} met dille, knoflook en een druivenblad (voor de knapperigheid) in de pot.","Giet de 3,5% pekel erover; alles onder het vocht.","Ferment 7–14 dagen op ±18°C; koel bij de gewenste zuurte."] },
  { id:"fkosho", baseName:"Tuinkosho", varTemplate:"Kosho van {x}", generic:"citrus", category:"Fermentatie", yield:"1 potje", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:10,tempC:20,days:7}, gear:"Fermentatiemateriaal",
    mains:["citroen","limoen","yuzu"],
    ingredients:[{item:"Schilrasp en sap van {x}",amount:"100 g"},{item:"Oost-Indische kers (blad en bloem), fijngehakt",amount:"50 g"},{item:"Zout (10%)",amount:"15 g"}],
    steps:["Meng rasp en sap van {x} met de fijngehakte Oost-Indische kers en 10% zout.","Ferment 1 week op ±20°C in een klein potje.","Rijp daarna koel; gebruik met mate als scherpe condiment."] },
  { id:"zoutpruim", baseName:"Zoutpruimen (umeboshi-stijl)", varTemplate:"Zoutpruimen van {x}", generic:"steenfruit", category:"Fermentatie", yield:"1 pot", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:10,tempC:20,days:30}, gear:"Fermentatiemateriaal / droogoven",
    mains:["pruim","reine claude"],
    ingredients:[{item:"{X}, net niet rijp",amount:"1 kg"},{item:"Zout (10%)",amount:"100 g"},{item:"Rode melde (als shiso-alternatief)",amount:"een handvol"}],
    steps:["Wrijf de {x} in met het zout en verzwaar zodat er pekel vrijkomt.","Ferment 4 weken op ±20°C met de rode melde erbij voor kleur en aroma.","Droog de vruchten daarna kort na in de droogoven en bewaar in de eigen pekel."] },
  { id:"fmustard", baseName:"Gefermenteerde mosterd", generic:"mosterd", category:"Fermentatie", yield:"≈ 300 g", mode:"flavor", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:2.5,tempC:20,days:5}, gear:"Fermentatiemateriaal",
    ingredients:[{item:"Geel en bruin mosterdzaad",amount:"150 g"},{item:"Zuurkoolpekel (levend)",amount:"150 g"},{item:"Zout (2,5%)",amount:"8 g"}],
    steps:["Week het mosterdzaad in de levende zuurkoolpekel met het zout.","Ferment 3–5 dagen op ±20°C; roer dagelijks.","Maal grof of glad en rijp koel — de scherpte verzacht met de tijd."],
    variations:[{name:"Klassieke gefermenteerde mosterd"},{name:"Honingmosterd",add:"Roer na fermentatie honing erdoor."},{name:"Dragonmosterd",add:"Meng fijngehakte dragon erdoor.",season:["Lente","Zomer","Herfst"]},{name:"Bietenmosterd",add:"Vervang een deel pekel door bietensap."}] },
  { id:"cultzuivel", baseName:"Gekweekte zuivel", generic:"zuivel", category:"Fermentatie · zuivel", yield:"≈ 500 g", mode:"flavor", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:0,tempC:24,days:1}, gear:"KitchenAid",
    ingredients:[{item:"Room of melk",amount:"500 g"},{item:"Karnemelk met levende culturen (starter)",amount:"50 g"}],
    steps:["Verwarm de zuivel tot ±24°C en roer de starter erdoor.","Laat 18–24 uur afgedekt op kamertemperatuur dikken.","Koel terug; klaar als basis of om verder te verwerken."],
    variations:[{name:"Crème fraîche"},{name:"Karnemelk",add:"Gebruik melk i.p.v. room; langer laten aanzuren."},{name:"Gekweekte boter",add:"Klop de gekweekte room in de KitchenAid tot boter en karnemelk; was de boter koud."}] },

  // ---- FERMENTATIE: suikerfermentatie (dranken) ----
  { id:"gingerbeer", baseName:"Gemberbier", generic:"gember", category:"Fermentatie · dranken", yield:"≈ 2 l", mode:"flavor", ferment:true, fermentMethod:"Suikerfermentatie", fermentDefaults:{saltPct:0,tempC:22,days:4}, gear:"Fermentatiemateriaal",
    ingredients:[{item:"Gemberbug (actieve starter)",amount:"100 g"},{item:"Verse gember, geraspt",amount:"60 g"},{item:"Suiker",amount:"160 g"},{item:"Water",amount:"2 l"},{item:"Citroensap",amount:"30 g"}],
    steps:["Meng water, suiker, gember, citroensap en de actieve gemberbug.","Ferment 2–4 dagen op ±22°C tot het bruist; zeef en bottel.","LET OP druk: gebruik beugelflessen of PET en ontlucht dagelijks; koel serveren."],
    variations:[{name:"Klassiek gemberbier"},{name:"Citroen-gemberbier",add:"Extra citroenrasp bij het bottelen."},{name:"Munt-gemberbier",add:"Trek munt mee in de tweede fermentatie.",season:["Lente","Zomer","Herfst"]},{name:"Frambozen-gemberbier",add:"Handvol frambozen in de fles voor kleur en smaak.",season:["Zomer","Herfst"]}] },
  { id:"waterkefir", baseName:"Waterkefir", generic:"kefir", category:"Fermentatie · dranken", yield:"≈ 1,5 l", mode:"flavor", ferment:true, fermentMethod:"Suikerfermentatie", fermentDefaults:{saltPct:0,tempC:22,days:2}, gear:"Fermentatiemateriaal",
    ingredients:[{item:"Waterkefirkorrels",amount:"60 g"},{item:"Suiker",amount:"70 g"},{item:"Water",amount:"1,5 l"},{item:"Ongezwavelde rozijn & schijfje citroen",amount:"per pot"}],
    steps:["Los de suiker op in het water en voeg korrels, rozijn en citroen toe.","Ferment 24–48 uur op kamertemperatuur; zeef de korrels terug voor de volgende ronde.","Bottel voor een tweede fermentatie van 1–2 dagen; ontlucht dagelijks en koel."],
    variations:[{name:"Klassieke waterkefir"},{name:"Aardbei-waterkefir",add:"Aardbeien in de tweede fermentatie.",season:["Lente","Zomer"]},{name:"Frambozen-waterkefir",add:"Frambozen in de tweede fermentatie.",season:["Zomer","Herfst"]},{name:"Citroenmelisse-waterkefir",add:"Takjes citroenmelisse in de fles.",season:["Zomer"]},{name:"Munt-waterkefir",add:"Verse munt in de fles.",season:["Lente","Zomer","Herfst"]}] },
  { id:"kombucha", baseName:"Kombucha", generic:"thee", category:"Fermentatie · dranken", yield:"≈ 2 l", mode:"flavor", ferment:true, fermentMethod:"Suikerfermentatie", fermentDefaults:{saltPct:0,tempC:23,days:10}, gear:"Fermentatiemateriaal",
    ingredients:[{item:"Sterke thee (zwart of groen)",amount:"2 l"},{item:"Suiker",amount:"160 g"},{item:"SCOBY + starterthee",amount:"1 stuk + 200 g"}],
    steps:["Zoet de thee, laat afkoelen en voeg SCOBY en starterthee toe.","Ferment 7–14 dagen op ±23°C onder een doek; proef vanaf dag 7.","Bottel (eventueel met fruit of kruiden voor de tweede fermentatie); ontlucht dagelijks."],
    variations:[{name:"Klassieke kombucha"},{name:"Appelkombucha",add:"Appelsap of -stukjes in de tweede fermentatie.",season:["Herfst","Winter"]},{name:"Druivenkombucha",add:"Gekneusde druiven in de fles.",season:["Herfst"]},{name:"Kruidenkombucha",add:"Tweede fermentatie met tijm of salie."}] },
  { id:"tepache", baseName:"Schillenbrouwsel", varTemplate:"Schillenbrouwsel van {x}", generic:"fruit", category:"Fermentatie · dranken", yield:"≈ 2 l", ferment:true, fermentMethod:"Suikerfermentatie", fermentDefaults:{saltPct:0,tempC:22,days:3}, gear:"Fermentatiemateriaal",
    mains:["appel","peer","kweepeer","ananas"],
    ingredients:[{item:"Schillen en klokhuizen van {x}",amount:"400 g"},{item:"Suiker of rietsuiker",amount:"150 g"},{item:"Water",amount:"2 l"},{item:"Kaneel of specerijen",amount:"naar smaak"}],
    steps:["Doe de schillen van {x} met suiker, water en specerijen in een pot; dek af met een doek.","Ferment 2–4 dagen op ±22°C tot het licht bruist (wilde gist van de schil).","Zeef, bottel en koel; ontlucht dagelijks. Mooi zero-waste uit de keuken."] },
  { id:"wildesoda", baseName:"Wilde bruislimonade", varTemplate:"Wilde bruis van {x}", generic:"bloem", category:"Fermentatie · dranken", yield:"≈ 2 l", ferment:true, fermentMethod:"Suikerfermentatie", fermentDefaults:{saltPct:0,tempC:22,days:3}, gear:"Fermentatiemateriaal",
    mains:["kamille","lavendel","citroenmelisse","munt","goudsbloem","korenbloem"],
    ingredients:[{item:"{X} (vers, ongewassen voor de wilde gist)",amount:"40 g"},{item:"Suiker",amount:"150 g"},{item:"Water",amount:"2 l"},{item:"Citroensap",amount:"30 g"}],
    steps:["Meng alles in een pot en dek af met een doek; roer 2× per dag.","Ferment 2–4 dagen op ±22°C tot er belletjes verschijnen.","Zeef en bottel; LET OP druk — beugelfles of PET, dagelijks ontluchten, koel serveren."] },
  { id:"landwijn", baseName:"Landwijn", varTemplate:"Landwijn van {x}", generic:"tuinfruit", category:"Fermentatie · dranken", yield:"≈ 5 l", ferment:true, fermentMethod:"Suikerfermentatie", fermentDefaults:{saltPct:0,tempC:20,days:21}, gear:"Fermentatiemateriaal (mandfles + waterslot)",
    mains:["druif","appel","pruim","braam","framboos","aalbes"],
    ingredients:[{item:"{X}, gekneusd",amount:"3 kg"},{item:"Suiker",amount:"800 g"},{item:"Water",amount:"tot 5 l"},{item:"Wijngist (of wild, met geduld)",amount:"1 zakje"}],
    steps:["Kneus de {x}, voeg suikerwater en gist toe in een mandfles met waterslot.","Ferment 2–4 weken op ±20°C tot het waterslot stil valt.","Hevel over van het bezinksel en laat minimaal 2 maanden rijpen."] },
  { id:"cider", baseName:"Boerderijcider", varTemplate:"Cider van {x}", generic:"fruit", category:"Fermentatie · dranken", yield:"≈ 5 l", ferment:true, fermentMethod:"Suikerfermentatie", fermentDefaults:{saltPct:0,tempC:18,days:14}, gear:"Sapcentrifuge + waterslot",
    mains:["appel","peer","kweepeer"],
    ingredients:[{item:"Sap van {x} (sapcentrifuge)",amount:"5 l"},{item:"Cidergist (of wild)",amount:"1 zakje"}],
    steps:["Pers het sap van {x} en doe het met de gist in een mandfles met waterslot.","Ferment 2–3 weken op ±18°C tot droog.","Hevel over, laat klaren en bottel; kort nagisten op fles voor bubbels (ontlucht bij twijfel)."] },
  { id:"honingknoflook", baseName:"Honing-knoflook", generic:"knoflook", category:"Fermentatie", yield:"1 pot", mode:"flavor", ferment:true, fermentMethod:"Suikerfermentatie", fermentDefaults:{saltPct:0,tempC:20,days:30}, gear:"Fermentatiemateriaal",
    ingredients:[{item:"Knoflooktenen, gepeld",amount:"250 g"},{item:"Rauwe honing",amount:"om onder te dompelen"}],
    steps:["Dompel de gepelde tenen volledig onder in rauwe honing.","Keer de pot de eerste 2 weken dagelijks; ontlucht het deksel regelmatig.","Na ±1 maand zacht en rond van smaak; wordt maandenlang beter."],
    variations:[{name:"Klassieke honing-knoflook",season:["Zomer","Herfst"]},{name:"Honing-knoflook met chili",add:"Voeg gedroogde chili toe.",season:["Zomer","Herfst"]},{name:"Honing-knoflook met tijm",add:"Takjes tijm mee in de pot.",season:["Zomer","Herfst"]}] },

  // ---- FERMENTATIE: azijn (tweetraps, met moeder en zuurstof) ----
  { id:"fruitazijnlevend", baseName:"Levende fruitazijn", varTemplate:"Levende azijn van {x}", generic:"tuinfruit", category:"Fermentatie · azijn", yield:"≈ 1 l", ferment:true, fermentMethod:"Azijnfermentatie", fermentDefaults:{saltPct:0,tempC:24,days:30}, gear:"Fermentatiemateriaal",
    mains:["appel","peer","druif","framboos","braam","pruim"],
    ingredients:[{item:"{X}, gekneusd",amount:"500 g"},{item:"Water",amount:"1 l"},{item:"Suiker",amount:"100 g"},{item:"Levende azijn of azijnmoeder",amount:"scheut"}],
    steps:["Laat de {x} met suikerwater eerst enkele dagen tot alcohol vergisten (doek erover, dagelijks roeren).","Zeef en voeg de azijnmoeder toe; dek af met een doek — azijn heeft zuurstof nodig, dus géén deksel.","Laat 3–6 weken op ±24°C verzuren; proef, zeef en bottel."] },
  { id:"wijnazijn", baseName:"Wijnazijn van restjes", generic:"wijn", category:"Fermentatie · azijn", yield:"≈ 1 l", mode:"flavor", ferment:true, fermentMethod:"Azijnfermentatie", fermentDefaults:{saltPct:0,tempC:24,days:45}, gear:"Fermentatiemateriaal",
    ingredients:[{item:"Wijnresten (open flessen)",amount:"1 l"},{item:"Water",amount:"250 g"},{item:"Azijnmoeder of levende azijn",amount:"scheut"}],
    steps:["Verdun de wijnresten iets met water en voeg de azijnmoeder toe.","Dek af met een doek (zuurstof!) en zet weg op ±24°C.","Proef na 4–6 weken; zeef, bottel en bewaar de moeder voor de volgende ronde."],
    variations:[{name:"Rodewijnazijn"},{name:"Wittewijnazijn"},{name:"Ciderazijn",add:"Gebruik eigen cider als basis."}] },
  { id:"kombuchaazijn", baseName:"Kombucha-azijn", generic:"kombucha", category:"Fermentatie · azijn", yield:"≈ 1 l", mode:"flavor", ferment:true, fermentMethod:"Azijnfermentatie", fermentDefaults:{saltPct:0,tempC:23,days:30}, gear:"Fermentatiemateriaal",
    ingredients:[{item:"Kombucha (doorgefermenteerd)",amount:"1 l"}],
    steps:["Laat kombucha bewust 3–4 weken langer doorfermenteren onder een doek.","Proef tot de zuurgraad die van azijn benadert.","Zeef en bottel; gebruik als frisse azijn in dressings en pekels."],
    variations:[{name:"Klassieke kombucha-azijn"},{name:"Kruiden-kombucha-azijn",add:"Trek na het bottelen met tijm of dragon."}] },

  // ---- voorraad-basistechnieken (extra breedte) ----
  { id:"coulis", baseName:"Fruitcoulis", noun:"Coulis", generic:"fruit", category:"Gels & sauzen", yield:"≈ 350 g", mains:FRUIT_ONLY,
    ingredients:[{item:"Puree van {x}",amount:"300 g"},{item:"Poedersuiker",amount:"40 g"},{item:"Citroensap",amount:"10 g"}],
    steps:["Mix puree van {x} met suiker en citroen.","Verdun voor een lopende saus.","Passeer en koel."] },
  { id:"compote", baseName:"Fruitcompote", noun:"Compote", generic:"fruit", category:"Compotes & jam", yield:"≈ 400 g", mains:FRUIT_ONLY,
    ingredients:[{item:"{X} in stukken",amount:"400 g"},{item:"Suiker",amount:"80 g"},{item:"Citroensap",amount:"10 g"}],
    steps:["Wel de {x} met suiker.","Kook zachtjes in tot compote.","Op smaak en koel."] },
  { id:"jam", baseName:"Fruitconfituur", noun:"Confituur", generic:"fruit", category:"Compotes & jam", yield:"≈ 3 potten", mains:FRUIT_ONLY,
    ingredients:[{item:"{X}",amount:"500 g"},{item:"Geleisuiker",amount:"500 g"},{item:"Citroensap",amount:"20 g"}],
    steps:["Kook met geleisuiker.","4 min doorkoken; test op een koud bordje.","Vul potten heet af."] },
  { id:"fpowder", baseName:"Fruitpoeder", varTemplate:"Poeder van {x}", generic:"fruit", category:"Krokant & garnituur", yield:"≈ 60 g", gear:"Droogoven", mains:FRUIT_ONLY,
    ingredients:[{item:"Puree van {x}",amount:"300 g"}],
    steps:["Strijk dun uit op een mat.","Droog op 60°C tot leerachtig.","Maal tot poeder."] },
  { id:"pearl", baseName:"Fruitparels", varTemplate:"Parels van {x}", generic:"fruit", category:"Garnituur", yield:"≈ 150 g", mains:FRUIT,
    ingredients:[{item:"Sap van {x}",amount:"200 g"},{item:"Agar-agar",amount:"2 g"},{item:"IJskoude olie",amount:"500 ml"}],
    steps:["Kook sap van {x} met agar.","Druppel in ijskoude olie.","Zeef en spoel."] },
  { id:"fchip", baseName:"Fruitchip", varTemplate:"Fruitchip van {x}", generic:"fruit", category:"Krokant & garnituur", yield:"≈ 20 chips", gear:"Droogoven", mains:FRUIT,
    ingredients:[{item:"Dunne plakjes {x}",amount:"1 stuk"},{item:"Poedersuiker",amount:"naar behoefte"}],
    steps:["Snijd flinterdun.","Bestrooi licht met suiker.","Droog op 90°C tot krokant."] },
  { id:"fleather", baseName:"Fruitleer", varTemplate:"Fruitleer van {x}", generic:"fruit", category:"Krokant & garnituur", yield:"1 vel", gear:"Droogoven", mains:FRUIT,
    ingredients:[{item:"Puree van {x}",amount:"400 g"},{item:"Suiker",amount:"30 g"}],
    steps:["Strijk de puree dun uit.","Droog op 60°C tot buigzaam.","Snijd op maat."] },
  { id:"fvinegar2", baseName:"Fruitazijn", varTemplate:"Azijn van {x}", generic:"fruit", category:"Oliën & vinaigrettes", yield:"≈ 300 g", mains:FRUIT,
    ingredients:[{item:"{X}",amount:"150 g"},{item:"Witte-wijnazijn",amount:"300 g"}],
    steps:["Doe de {x} in de azijn.","Laat 2 weken trekken.","Zeef en bottel."] },
  { id:"chutney", baseName:"Fruitchutney", varTemplate:"Chutney van {x}", generic:"fruit", category:"Compotes & jam", yield:"≈ 3 potten", mains:FRUIT,
    ingredients:[{item:"{X}",amount:"500 g"},{item:"Ui",amount:"100 g"},{item:"Azijn",amount:"100 g"},{item:"Suiker",amount:"120 g"},{item:"Specerijen",amount:"naar smaak"}],
    steps:["Fruit de ui aan.","Voeg {x}, azijn, suiker en specerijen toe.","Kook in tot chutney; vul heet af."] },
  { id:"vpuree", baseName:"Groentepuree (voorraad)", noun:"Puree", generic:"groente", category:"Purees", yield:"≈ 500 g", gear:"Thermoblender", mains:VEG_ONLY,
    ingredients:[{item:"{X}",amount:"500 g"},{item:"Boter",amount:"50 g"},{item:"Melk of bouillon",amount:"200 g"},{item:"Zout",amount:"naar smaak"}],
    steps:["Gaar de {x} zacht.","Mix in de thermoblender glad.","Op smaak en passeer."] },
  { id:"vespuma", baseName:"Groente-espuma (voorraad)", noun:"Espuma", generic:"groente", category:"Schuim & espuma", yield:"1 sifon", gear:"Sifon", mains:VEG_ONLY,
    ingredients:[{item:"Puree van {x}",amount:"400 g"},{item:"Room",amount:"100 g"},{item:"Gelatineblaadje",amount:"1 blaadje"}],
    steps:["Meng warme puree van {x} met room en gelatine.","Vul een sifon; 2 patronen.","Koel; schud voor gebruik."] },
  { id:"vpickle", baseName:"Gepekelde groente (voorraad)", varTemplate:"Gepekelde {x}", generic:"groente", category:"Pickles & zuur", yield:"≈ 400 g", mains:VEG_ONLY,
    ingredients:[{item:"{X}",amount:"400 g"},{item:"Azijn",amount:"200 g"},{item:"Suiker",amount:"80 g"},{item:"Zout",amount:"8 g"}],
    steps:["Snijd de {x} op maat.","Kook de pekel en giet over de {x}.","Laat minimaal 1 uur trekken."] },
  { id:"vchip", baseName:"Groentechip (voorraad)", varTemplate:"Groentechip van {x}", generic:"groente", category:"Krokant & garnituur", yield:"≈ 20 chips", gear:"iVario", mains:VEG_ONLY.filter((v) => !["doperwt","mais"].includes(v)),
    ingredients:[{item:"Dunne plakjes {x}",amount:"1 stuk"},{item:"Zout",amount:"naar smaak"}],
    steps:["Snijd flinterdun.","Frituur of droog krokant.","Zout licht."] },
  { id:"vgel", baseName:"Groentegel (voorraad)", noun:"Gel", generic:"groente", category:"Gels & sauzen", yield:"≈ 400 g", gear:"Thermoblender", mains:VEG_ONLY.filter((v) => !["aardappel","aubergine","doperwt"].includes(v)),
    ingredients:[{item:"Sap van {x}",amount:"400 g"},{item:"Agar-agar",amount:"3 g"}],
    steps:["Kook sap van {x} met agar 2 min.","Opstijven en glad mixen.","Passeer in een knijpfles."] },
  { id:"herboil2", baseName:"Kruidenolie (voorraad)", varTemplate:"Olie van {x}", generic:"kruid", category:"Oliën & vinaigrettes", yield:"≈ 250 g", gear:"Thermoblender", mains:HERB_ONLY,
    ingredients:[{item:"{X}",amount:"100 g"},{item:"Neutrale olie",amount:"250 g"}],
    steps:["Blancheer de {x} kort en dep droog.","Mix met olie tot 70°C.","Laat uitlekken door een doek."] },
  { id:"herbgel2", baseName:"Kruidengel (voorraad)", noun:"Gel", generic:"kruid", category:"Gels & sauzen", yield:"≈ 300 g", mains:HERB_ONLY,
    ingredients:[{item:"Sap van {x}",amount:"300 g"},{item:"Agar-agar",amount:"3 g"}],
    steps:["Kook sap van {x} met agar 2 min.","Opstijven en mixen.","Passeer."] },
  { id:"pesto2", baseName:"Pesto (voorraad)", varTemplate:"Pesto van {x}", generic:"kruid", category:"Sauzen & emulsies", yield:"≈ 300 g", mains:HERB_ONLY,
    ingredients:[{item:"{X}",amount:"80 g"},{item:"Pijnboompitten of amandel",amount:"30 g"},{item:"Kaas",amount:"40 g"},{item:"Olijfolie",amount:"120 g"}],
    steps:["Rooster de pitten.","Mix {x}, pitten en kaas grof.","Monteer met olie; op smaak."] },
  { id:"praline", baseName:"Praliné", varTemplate:"Praliné van {x}", generic:"noot", category:"Zoet & patisserie", yield:"≈ 300 g", mains:NUT.slice(0,8),
    ingredients:[{item:"{X}",amount:"150 g"},{item:"Suiker",amount:"150 g"},{item:"Water",amount:"40 g"}],
    steps:["Rooster de {x}.","Maak een karamel.","Meng, laat hard worden en mix tot pasta."] },
  { id:"nutpaste", baseName:"Notenpasta", varTemplate:"Pasta van {x}", generic:"noot", category:"Zoet & patisserie", yield:"≈ 200 g", mains:NUT.slice(0,8),
    ingredients:[{item:"Geroosterde {x}",amount:"200 g"},{item:"Zout",amount:"snuf"}],
    steps:["Rooster de {x} goudbruin.","Mix tot gladde pasta.","Bewaar afgesloten."] },
  { id:"patissiere", baseName:"Crème pâtissière", generic:"vanille", category:"Zoet & patisserie", yield:"≈ 650 g", mode:"flavor",
    ingredients:[{item:"Melk",amount:"500 g"},{item:"Eidooiers",amount:"4 stuks"},{item:"Suiker",amount:"100 g"},{item:"Maïzena",amount:"40 g"}],
    steps:["Verwarm de melk.","Bind met dooiers, suiker en maïzena.","Kook 2 min door; koel afgedekt."],
    variations:[{name:"Vanillebanketbakkersroom",add:"Trek met vanille."},{name:"Koffiebanketbakkersroom",add:"Trek met koffie."},{name:"Citroenbanketbakkersroom",add:"Citroenrasp toevoegen."},{name:"Pistachebanketbakkersroom",add:"Pistachepasta erdoor."},{name:"Pralinébanketbakkersroom",add:"Pralinépasta erdoor."},{name:"Kaneelbanketbakkersroom",add:"Trek met kaneel."},{name:"Laurierbanketbakkersroom",add:"Trek kort met laurier."},{name:"Chocoladebanketbakkersroom",add:"Chocolade oplossen."}] },
  { id:"hollandaise", baseName:"Hollandaisefamilie", generic:"boter", category:"Sauzen & emulsies", yield:"≈ 300 g", mode:"flavor",
    ingredients:[{item:"Eidooiers",amount:"3 stuks"},{item:"Geklaarde boter",amount:"200 g"},{item:"Citroensap",amount:"10 g"},{item:"Reductie",amount:"20 g"}],
    steps:["Klop dooiers met reductie au bain-marie tot ruban.","Monteer met de boter.","Op smaak met citroen."],
    variations:[{name:"Hollandaise"},{name:"Béarnaise",add:"Dragonreductie en verse dragon.",season:["Lente","Zomer","Herfst"]},{name:"Choron",add:"Tomatenconcentraat door de béarnaise."},{name:"Maltaise",add:"Bloedsinaasappel.",season:["Winter"]},{name:"Mousseline",add:"Opgeslagen room erdoor."},{name:"Paloise",add:"Munt i.p.v. dragon.",season:["Lente","Zomer","Herfst"]}] },
  { id:"sponge", baseName:"Sifon-spons", generic:"spons", category:"Zoet & patisserie", yield:"≈ 8 stuks", mode:"flavor", gear:"Sifon",
    ingredients:[{item:"Eiwit",amount:"100 g"},{item:"Eidooier",amount:"60 g"},{item:"Suiker",amount:"60 g"},{item:"Bloem",amount:"40 g"}],
    steps:["Mix glad en passeer in een sifon.","2 patronen; vul bekers tot een derde.","Gaar 40 sec in de magnetron."],
    variations:[{name:"Bietenspons",add:"Kleur met bietenpoeder."},{name:"Basilicumspons",add:"Verse basilicum door het beslag.",season:["Zomer"]},{name:"Citroenspons",add:"Citroenrasp."},{name:"Chocoladespons",add:"Cacao toevoegen."},{name:"Pistachespons",add:"Pistachepasta."},{name:"Zuringspons",add:"Verse zuring door het beslag.",season:["Lente","Zomer"]},{name:"Peterseliespons",add:"Geblancheerde peterselie door het beslag.",season:["Lente","Zomer","Herfst"]}] },
  { id:"granita", baseName:"Granité", generic:"fruit", category:"Sorbet & ijs", yield:"≈ 700 g", mode:"flavor", gear:"Vriezer",
    ingredients:[{item:"Sap of aftreksel",amount:"600 g"},{item:"Suiker",amount:"80 g"},{item:"Citroensap",amount:"15 g"}],
    steps:["Meng en breng op smaak.","Vries in en schraap elk half uur met een vork.","Bewaar luchtig bevroren."],
    variations:[{name:"Aardbei-granité",season:["Lente","Zomer"]},{name:"Framboos-granité",season:["Zomer","Herfst"]},{name:"Druiven-granité",season:["Herfst"]},{name:"Appel-granité",season:["Herfst","Winter"]},{name:"Rabarber-granité",season:["Lente"]},{name:"Citroenmelisse-granité",season:["Zomer"]},{name:"Munt-granité",season:["Lente","Zomer","Herfst"]},{name:"Kamille-granité",season:["Zomer"]}] },
  { id:"kruidensuiker", baseName:"Kruidensuiker", varTemplate:"Suiker van {x}", generic:"kruid", category:"Zoet & patisserie", yield:"≈ 220 g", gear:"Droogoven", mains:["munt","citroenmelisse","lavendel","kamille","rozemarijn","tijm"],
    ingredients:[{item:"{X}",amount:"20 g"},{item:"Suiker",amount:"200 g"}],
    steps:["Droog de {x} in de droogoven.","Vermaal met de suiker.","Bewaar droog en afgesloten."] },

  { id:"siroop", baseName:"Kruiden- en bloemensiroop", varTemplate:"Siroop van {x}", generic:"kruid", category:"Zoet & patisserie", yield:"≈ 500 g",
    mains:["munt","citroenmelisse","lavendel","kamille","rozemarijn","tijm","salie","lavas","goudsbloem","korenbloem"],
    ingredients:[{item:"{X}",amount:"30 g"},{item:"Water",amount:"300 g"},{item:"Suiker",amount:"300 g"}],
    steps:["Breng water en suiker aan de kook.","Voeg de {x} toe en laat van het vuur 20 min afgedekt trekken.","Zeef, koel terug en bewaar in de koeling."] },
  { id:"gedroogd", baseName:"Gedroogde kruiden & bloemen", varTemplate:"Gedroogde {x}", generic:"kruid", category:"Kruiden & zout", yield:"1 pot", gear:"Droogoven",
    mains:[...GHERB,"kamille","lavendel","goudsbloem","korenbloem"],
    ingredients:[{item:"{X}",amount:"1 bos"}],
    steps:["Was de {x} en dep goed droog.","Droog op 40–50°C tot ritselend droog.","Verkruimel en bewaar luchtdicht en donker."] },

  // ---- VLEES (voornamelijk varken, soms rund) ----
  { id:"pork", baseName:"Varkensvlees (eigen varkens)", generic:"varken", category:"Vlees", yield:"naar behoefte", mode:"flavor", diet:"Varkensvlees", gear:"iVario / Black Bastard", endorsements:["Michael"],
    ingredients:[{item:"Varkensvlees (eigen varkens)",amount:"1 kg"},{item:"Zout",amount:"18 g/kg"},{item:"Aromaten",amount:"naar smaak"}],
    steps:["Kruid het vlees ruim, bij voorkeur een dag vooraf.","Gaar langzaam in de iVario of op de Black Bastard tot zacht.","Laat rusten en maak af."],
    variations:[{name:"Gegaarde procureur"},{name:"Gelakte buik"},{name:"Pulled schouder"},{name:"Varkenswang in eigen jus"},{name:"Krokante krosse"}] },
  { id:"beef", baseName:"Rundvlees", generic:"rund", category:"Vlees", yield:"naar behoefte", mode:"flavor", diet:"Rundvlees", gear:"iVario",
    ingredients:[{item:"Rundvlees",amount:"1 kg"},{item:"Zout",amount:"18 g/kg"},{item:"Wortel, ui, tijm",amount:"mirepoix"}],
    steps:["Kleur het vlees rondom.","Smoor langzaam met mirepoix tot zacht.","Reduceer het vocht tot jus."],
    variations:[{name:"Gesmoorde sukade"},{name:"Short rib van het bot"},{name:"Runderwang"}] },
];

// Vereniging van de seizoenen van alle hoofdingrediënten van een basis.
// Dekt de basis het hele jaar (of alle vier de seizoenen), dan "Hele jaar".
function unionSeason(mains) {
  const set = new Set();
  for (const m of mains) for (const s of seasonOf(m)) set.add(s);
  if (set.has("Hele jaar") || SEASONS.every((s) => set.has(s))) return ["Hele jaar"];
  return SEASONS.filter((s) => set.has(s));
}

function buildLibrary() {
  const out = [];
  for (const b of BASES) {
    const noun = b.noun || b.baseName;
    out.push({
      id: b.id, name: b.baseName + " (basis)", category: b.category, yield: b.yield,
      ingredients: b.ingredients.map((x) => ({ item: fill(x.item, b.generic), amount: x.amount })),
      steps: b.steps.map((s) => fill(s, b.generic)),
      endorsements: b.endorsements ? [...b.endorsements] : [], chefsPick: !!b.chefsPick,
      baseId: null, baseName: null, isBase: true,
      season: b.mode === "flavor" ? ["Hele jaar"] : unionSeason(b.mains), garden: false,
      diet: b.diet || "Vegetarisch", ferment: !!b.ferment, fermentMethod: b.fermentMethod || null, fermentDefaults: b.fermentDefaults || null,
      gear: b.gear || null, updatedBy: "Keukenteam", updatedAt: "startbibliotheek",
    });
    if (b.mode === "flavor") {
      for (const v of b.variations) {
        out.push({
          id: b.id + "-" + slug(v.name), name: v.name, category: b.category, yield: b.yield,
          ingredients: b.ingredients.map((x) => ({ ...x })),
          steps: v.add ? [...b.steps, "Variatie: " + v.add] : [...b.steps],
          endorsements: [], chefsPick: false, baseId: b.id, baseName: b.baseName, isBase: false,
          season: v.season || ["Hele jaar"], garden: false, diet: b.diet || "Vegetarisch",
          ferment: !!b.ferment, fermentMethod: b.fermentMethod || null, fermentDefaults: b.fermentDefaults || null, gear: b.gear || null,
          updatedBy: "Keukenteam", updatedAt: "startbibliotheek",
        });
      }
    } else {
      for (const m of b.mains) {
        const nm = b.varTemplate ? fill(b.varTemplate, m) : noun + " van " + m;
        out.push({
          id: b.id + "-" + slug(m), name: nm, category: b.category, yield: b.yield,
          ingredients: b.ingredients.map((x) => ({ item: fill(x.item, m), amount: x.amount })),
          steps: b.steps.map((s) => fill(s, m)),
          endorsements: [], chefsPick: false, baseId: b.id, baseName: b.baseName, isBase: false,
          season: seasonOf(m), garden: GARDEN_ALL.includes(m), diet: b.diet || "Vegetarisch",
          ferment: !!b.ferment, fermentMethod: b.fermentMethod || null, fermentDefaults: b.fermentDefaults || null, gear: b.gear || null,
          updatedBy: "Keukenteam", updatedAt: "startbibliotheek",
        });
      }
    }
  }
  return out;
}

const CURATED = [
  { id:"c-tomato-mousse", name:"Hartige tomatenmousse", category:"Mousses", yield:"≈ 550 g",
    ingredients:[{item:"Gezeefde tomaten (passata)",amount:"300 g"},{item:"Slagroom",amount:"200 g"},{item:"Gelatineblaadjes",amount:"3 blaadjes"},{item:"Basilicum, fijngesneden",amount:"enkele blaadjes"},{item:"Zout & peper",amount:"naar smaak"}],
    steps:["Week de gelatine en los op in een derde van de warme passata.","Meng met de rest van de passata en breng stevig op smaak met zout en peper.","Koel tot lobbig en spatel de halfgeslagen room en de basilicum erdoor.","Laat minimaal 3 uur opstijven."],
    endorsements:["Michael"], chefsPick:false, baseId:null, isBase:false, season:["Zomer"], garden:true, diet:"Vegetarisch", ferment:false, gear:"Thermoblender", updatedBy:"Michael", updatedAt:"1 week geleden" },
  { id:"c-caprese-mozz", name:"Gerookte mozzarella", category:"Zuivel", yield:"4 porties",
    ingredients:[{item:"Buffelmozzarella",amount:"2 bollen"},{item:"Beukenrookmot",amount:"1 handvol"},{item:"Olijfolie",amount:"om in te wrijven"},{item:"Zeezout",amount:"om af te maken"}],
    steps:["Laat de mozzarella uitlekken en dep droog.","Rook koud 8–10 min zonder hitte.","Trek in stukken en maak af."],
    endorsements:["Michael","Simon"], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Black Bastard", updatedBy:"Simon", updatedAt:"1 week geleden" },
  { id:"c-olive-crumble", name:"Olijvencrumble", category:"Crumbles & garnituur", yield:"≈ 200 g",
    ingredients:[{item:"Zwarte olijven, ontpit",amount:"150 g"},{item:"Panko",amount:"60 g"},{item:"Olijfolie",amount:"20 g"}],
    steps:["Droog de olijven en maal tot poeder.","Rooster de panko goudbruin.","Meng en bewaar krokant."],
    endorsements:["Kim","Michael"], chefsPick:true, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Droogoven", updatedBy:"Kim", updatedAt:"3 dagen geleden" },
  { id:"c-balsamic-pearls", name:"Balsamicoparels", category:"Garnituur", yield:"≈ 150 g",
    ingredients:[{item:"Balsamicoazijn",amount:"150 g"},{item:"Agar-agar",amount:"1,5 g"},{item:"IJskoude olie",amount:"500 ml"}],
    steps:["Kook de balsamico met agar.","Druppel in ijskoude olie tot parels.","Zeef en spoel."],
    endorsements:["Isa"], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Isa", updatedAt:"4 dagen geleden" },
];

const LIBRARY = buildLibrary();
const initialRecipes = [...CURATED, ...LIBRARY];

const seedDishes = [
  { id:"d1", name:"Salade Caprese", course:"Zomervoorgerecht", season:["Zomer"], diet:"Vegetarisch",
    description:"Gedeconstrueerde caprese met tomaat uit eigen tuin, rook en kruid.",
    plating:"Quenelle hartige tomatenmousse, gerookte mozzarella, gel van basilicum, olijvencrumble en balsamicoparels.",
    recipeIds:["c-tomato-mousse","c-caprese-mozz","herbgel2-basilicum","c-olive-crumble","c-balsamic-pearls"],
    updatedBy:"Michael", updatedAt:"2 dagen geleden" },
  { id:"d2", name:"Drie bieten uit eigen tuin", course:"Herfstvoorgerecht", season:["Herfst"], diet:"Vegetarisch",
    description:"Rode, gele en chioggia biet in verschillende texturen, met appel en dragon.",
    plating:"Geroosterde rode biet, carpaccio van chioggia biet, gepekelde gele biet, compote van appel en olie van dragon.",
    recipeIds:["roast-rode-biet","gcarp-chioggia-biet","gpickle-gele-biet","gcompote-appel","gherboil-dragon"],
    updatedBy:"Stef", updatedAt:"1 dag geleden" },
  { id:"d3", name:"Courgette & tuinbloemen", course:"Zomertussengerecht", season:["Zomer"], diet:"Vegetarisch",
    description:"Gegrilde courgette met eetbare bloemen en frisse kruiden uit de tuin.",
    plating:"Gegrilde courgette, puree van courgette, gepekelde courgettebloem, azijn van goudsbloem en olie van bieslook.",
    recipeIds:["grill-courgette","gpuree-courgette","pflower-courgettebloem","fvinegar-goudsbloem","gherboil-bieslook"],
    updatedBy:"Simon", updatedAt:"3 dagen geleden" },
  { id:"d4", name:"Boerenkool & eigen varken", course:"Winterhoofdgerecht", season:["Winter"], diet:"Varkensvlees",
    description:"Winters bord met langgegaard varken van eigen varkens en boerenkool.",
    plating:"Gegaarde procureur, puree van boerenkool, geroosterde pastinaak, gefermenteerde rode kool en tijm-knoflookjus.",
    recipeIds:["pork-gegaarde-procureur","gpuree-boerenkool","roast-pastinaak","lacto-rode-kool","jus-tijm-knoflookjus"],
    updatedBy:"Michael", updatedAt:"2 dagen geleden" },
  { id:"d5", name:"Aardbei, rabarber & kamille", course:"Lentedessert", season:["Lente"], diet:"Vegetarisch",
    description:"Frisse lente met aardbei en rabarber uit de tuin, en een vleugje kamille.",
    plating:"Gepocheerde rabarber, sorbet van aardbei, coulis van aardbei en anglaise van kamille.",
    recipeIds:["gpoach-rabarber","gsorbet-aardbei","gcoulis-aardbei","anglaise-kamille-anglaise"],
    updatedBy:"Isa", updatedAt:"4 dagen geleden" },
  { id:"d6", name:"Knolselderij & appel", course:"Wintervoorgerecht", season:["Winter"], diet:"Vegetarisch",
    description:"Zijdezachte knolselderij met zoetzure appel en hazelnoot.",
    plating:"Puree van knolselderij, geroosterde knolselderij, compote van appel, crumble van hazelnoot en beurre blanc.",
    recipeIds:["gpuree-knolselderij","roast-knolselderij","gcompote-appel","crumble-hazelnoot","beurreblanc-klassieke-beurre-blanc"],
    updatedBy:"Stef", updatedAt:"5 dagen geleden" },
  { id:"d7", name:"Tomaten van het erf", course:"Zomervoorgerecht", season:["Zomer"], diet:"Vegetarisch",
    description:"Tomaat uit eigen tuin in vier texturen, met rook en kruid.",
    plating:"Mousse van tomaat, tartaar van tomaat, gefermenteerde hotsauce van tomaat, olie van bieslook en olijvencrumble.",
    recipeIds:["c-tomato-mousse","gtartaar-tomaat","fhot-tomaat","gherboil-bieslook","c-olive-crumble"],
    updatedBy:"Michael", updatedAt:"1 dag geleden" },
  { id:"d8", name:"Venkel, peer & walnoot", course:"Herfstvoorgerecht", season:["Herfst"], diet:"Vegetarisch",
    description:"Gegrilde venkel met gepocheerde peer en een noot van walnoot.",
    plating:"Gegrilde venkel, gel van venkel, gepocheerde peer, olie van dragon en pasta van walnoot.",
    recipeIds:["grill-venkel","ggel-venkel","gpoach-peer","gherboil-dragon","nutpaste-walnoot"],
    updatedBy:"Simon", updatedAt:"2 dagen geleden" },
  { id:"d9", name:"Erwt, munt & radijs", course:"Lentetussengerecht", season:["Lente"], diet:"Vegetarisch",
    description:"Zoete erwten uit de tuin met frisse munt en knapperige radijs.",
    plating:"Espuma van erwten, puree van erwten, gepekelde radijs, olie van munt en gel van munt.",
    recipeIds:["gespuma-erwten","beanpuree-erwten","gpickle-radijs","gherboil-munt","gherbgel-munt"],
    updatedBy:"Isa", updatedAt:"2 dagen geleden" },
  { id:"d10", name:"Rabarber & kamille", course:"Lentedessert", season:["Lente"], diet:"Vegetarisch",
    description:"Rabarber uit de tuin, licht bloemig met kamille.",
    plating:"Gepocheerde rabarber, sorbet van rabarber, coulis van rabarber, anglaise van kamille en gekonfijte kamille.",
    recipeIds:["gpoach-rabarber","gsorbet-rabarber","gcoulis-rabarber","anglaise-kamille-anglaise","candyflower-kamille"],
    updatedBy:"Isa", updatedAt:"3 dagen geleden" },
  { id:"d11", name:"Wortel in texturen", course:"Herfsttussengerecht", season:["Herfst","Winter"], diet:"Vegetarisch",
    description:"Wortel uit eigen tuin, van geroosterd tot krokant, met koriander.",
    plating:"Geroosterde wortel, puree van wortel, chip van wortel, gepekelde wortel en olie van koriander.",
    recipeIds:["roast-wortel","gpuree-wortel","gchip-wortel","gpickle-wortel","gherboil-koriander"],
    updatedBy:"Kim", updatedAt:"3 dagen geleden" },
  { id:"d12", name:"Aardpeer & hazelnoot", course:"Wintervoorgerecht", season:["Winter"], diet:"Vegetarisch",
    description:"Nootachtige aardpeer met hazelnoot en beurre blanc.",
    plating:"Puree van aardpeer, geroosterde aardpeer, chip van aardpeer, crumble van hazelnoot en beurre blanc.",
    recipeIds:["gpuree-aardpeer","roast-aardpeer","gchip-aardpeer","crumble-hazelnoot","beurreblanc-klassieke-beurre-blanc"],
    updatedBy:"Stef", updatedAt:"4 dagen geleden" },
  { id:"d13", name:"Rode kool, appel & eigen varken", course:"Winterhoofdgerecht", season:["Winter"], diet:"Varkensvlees",
    description:"Gelakte buik van eigen varkens met gefermenteerde rode kool en appel.",
    plating:"Gelakte buik, gefermenteerde rode kool, compote van appel, puree van knolselderij en tijm-knoflookjus.",
    recipeIds:["pork-gelakte-buik","lacto-rode-kool","gcompote-appel","gpuree-knolselderij","jus-tijm-knoflookjus"],
    updatedBy:"Michael", updatedAt:"1 dag geleden" },
  { id:"d14", name:"Gerookte biet & geitenkaas", course:"Herfstvoorgerecht", season:["Herfst"], diet:"Vegetarisch",
    description:"Drie bieten, gerookt en rauw, met dragon en balsamico.",
    plating:"Gerookte rode biet, carpaccio van chioggia biet, gepekelde gele biet, olie van dragon en balsamicoparels.",
    recipeIds:["gsmoke-rode-biet","gcarp-chioggia-biet","gpickle-gele-biet","gherboil-dragon","c-balsamic-pearls"],
    updatedBy:"Simon", updatedAt:"2 dagen geleden" },
  { id:"d15", name:"Courgette, bloem & munt", course:"Zomertussengerecht", season:["Zomer"], diet:"Vegetarisch",
    description:"Gegrilde courgette met eetbare bloem en frisse munt.",
    plating:"Gegrilde courgette, tartaar van courgette, gepekelde courgettebloem, olie van munt en azijn van goudsbloem.",
    recipeIds:["grill-courgette","gtartaar-courgette","pflower-courgettebloem","gherboil-munt","fvinegar-goudsbloem"],
    updatedBy:"Kim", updatedAt:"4 dagen geleden" },
  { id:"d16", name:"Pruim, amandel & laurier", course:"Zomerdessert", season:["Zomer","Herfst"], diet:"Vegetarisch",
    description:"Zoete pruim en reine claude met amandel en een vleugje laurier.",
    plating:"Gepocheerde pruim, sorbet van pruim, compote van reine claude, pasta van amandel en anglaise van laurier.",
    recipeIds:["gpoach-pruim","gsorbet-pruim","gcompote-reine-claude","nutpaste-amandel","anglaise-laurier-anglaise"],
    updatedBy:"Isa", updatedAt:"5 dagen geleden" },

  // ---- 50 nieuwe gerechten (met fermentatiecomponenten), toegevoegd na peer review ----
  // ---------- LENTE ----------
  { id:"d17", name:"Asperge, mousseline & radijs uit het vat", course:"Lentevoorgerecht", season:["Lente"], diet:"Vegetarisch",
    description:"Romige asperge met luchtige mousseline en een zuur accent uit het fermentatievat.",
    plating:"Puree van asperge, mousseline, olie van bieslook en radijs uit het vat.",
    recipeIds:["vpuree-asperge","hollandaise-mousseline","gherboil-bieslook","fvat-radijs"], updatedBy:"Michael", updatedAt:"zojuist" },
  { id:"d18", name:"Meiknol in twee fermentaties", course:"Lentetussengerecht", season:["Lente"], diet:"Vegetarisch",
    description:"Meiknol rauw, als waterkimchi en uit het vat — fris, sprankelend en knapperig.",
    plating:"Carpaccio van meiknol, waterkimchi van meiknol met sprankelende pekel, meiknol uit het vat, olie van dille en zout van bieslook.",
    recipeIds:["gcarp-meiknol","dongchimi-meiknol","fvat-meiknol","herboil2-dille","gsalt-bieslook"], updatedBy:"Stef", updatedAt:"zojuist" },
  { id:"d19", name:"Radijs, gekweekte boter & loof", course:"Lentevoorgerecht", season:["Lente"], diet:"Vegetarisch",
    description:"Radijs met eigen gekweekte boter en een zure kruidenpasta van tuinzuring.",
    plating:"Tartaar en hele radijs, gekweekte boter, radijs uit het vat, kruidenpasta van tuinzuring en zout van bieslook.",
    recipeIds:["gtartaar-radijs","cultzuivel-gekweekte-boter","fvat-radijs","fherbpaste-tuinzuring","gsalt-bieslook"], updatedBy:"Kim", updatedAt:"zojuist" },
  { id:"d20", name:"Rabarber, crème fraîche & munt", course:"Lentedessert", season:["Lente"], diet:"Vegetarisch",
    description:"Zacht gepocheerde rabarber met eigen gekweekte crème fraîche en frisse munt.",
    plating:"Gepocheerde rabarber, quenelle crème fraîche, rabarber-granité en suiker van munt.",
    recipeIds:["gpoach-rabarber","cultzuivel-cre-me-frai-che","granita-rabarber-granite","kruidensuiker-munt"], updatedBy:"Isa", updatedAt:"zojuist" },
  { id:"d21", name:"Spitskool, dragonmosterd & zuurkool", course:"Lentetussengerecht", season:["Lente","Zomer"], diet:"Vegetarisch",
    description:"Gegrilde spitskool met gefermenteerde dragonmosterd en jonge zuurkool van dezelfde kool.",
    plating:"Gegrilde spitskool, dragonmosterd, zuurkool van spitskool, olie van dragon en olijvencrumble.",
    recipeIds:["grill-spitskool","fmustard-dragonmosterd","kraut-spitskool","gherboil-dragon","c-olive-crumble"], updatedBy:"Simon", updatedAt:"zojuist" },
  { id:"d22", name:"Spinazie & tuinzuring", course:"Lentevoorgerecht", season:["Lente"], diet:"Vegetarisch",
    description:"Groen op groen: spinazie, zure tuinzuring en een luchtige zuringspons.",
    plating:"Puree van spinazie, zuringspons, kruidenpasta van tuinzuring en crème fraîche.",
    recipeIds:["gpuree-spinazie","sponge-zuringspons","fherbpaste-tuinzuring","cultzuivel-cre-me-frai-che"], updatedBy:"Isa", updatedAt:"zojuist" },
  { id:"d23", name:"Gelakte buik, meiknol & lentegroen", course:"Lentehoofdgerecht", season:["Lente"], diet:"Varkensvlees",
    description:"Buik van eigen varkens met sprankelende waterkimchi en spinazie uit de tuin.",
    plating:"Gelakte buik, waterkimchi van meiknol, puree van spinazie, gefermenteerde mosterd en tijm-knoflookjus.",
    recipeIds:["pork-gelakte-buik","dongchimi-meiknol","gpuree-spinazie","fmustard-klassieke-gefermenteerde-mosterd","jus-tijm-knoflookjus"], updatedBy:"Michael", updatedAt:"zojuist" },
  { id:"d24", name:"Aardbei & gekweekte room", course:"Lentedessert", season:["Lente","Zomer"], diet:"Vegetarisch",
    description:"Aardbei uit de tuin met zure room en een frisse scheut aardbei-waterkefir.",
    plating:"Sorbet en coulis van aardbei, crème fraîche, suiker van munt en aan tafel een scheut aardbei-waterkefir.",
    recipeIds:["gsorbet-aardbei","gcoulis-aardbei","cultzuivel-cre-me-frai-che","kruidensuiker-munt","waterkefir-aardbei-waterkefir"], updatedBy:"Isa", updatedAt:"zojuist" },
  { id:"d55", name:"Paksoi, stelen & kimchi", course:"Lentetussengerecht", season:["Lente","Zomer"], diet:"Vegetarisch",
    description:"Paksoi in drie gedaanten: gefermenteerde stelen, kimchi en een umami-mayonaise.",
    plating:"Gefermenteerde stelen van paksoi, kimchi van paksoi, sojasaus-mayonaise, olie van bieslook en sesamtuile.",
    recipeIds:["fstem-paksoi","kimchi-paksoi","mayo-sojasaus-mayonaise","gherboil-bieslook","tuile-sesamtuile"], updatedBy:"Stef", updatedAt:"zojuist" },
  { id:"d64", name:"Munt & chocolade", course:"Lentedessert", season:["Lente","Zomer"], diet:"Vegetarisch",
    description:"Chocolade met munt uit de tuin, van ganache tot granité.",
    plating:"Muntganache, munt-granité, vanille-roomijs, suiker van munt en een glaasje munt-waterkefir.",
    recipeIds:["ganache-muntganache","granita-munt-granite","icecream-vanille-roomijs","kruidensuiker-munt","waterkefir-munt-waterkefir"], updatedBy:"Kim", updatedAt:"zojuist" },

  // ---------- ZOMER ----------
  { id:"d25", name:"Tomaat, zoutpruim & basilicum", course:"Zomervoorgerecht", season:["Zomer"], diet:"Vegetarisch",
    description:"Zomertomaat met de diepe umami van eigen zoutpruimen en gerookte mozzarella.",
    plating:"Tartaar van tomaat, fijngehakte zoutpruim, gerookte mozzarella, olie van basilicum en zout van oregano.",
    recipeIds:["gtartaar-tomaat","zoutpruim-pruim","c-caprese-mozz","herboil2-basilicum","gsalt-oregano"], updatedBy:"Michael", updatedAt:"zojuist" },
  { id:"d26", name:"Komkommer uit het vat & dille", course:"Zomervoorgerecht", season:["Zomer"], diet:"Vegetarisch",
    description:"Knapperige vatkomkommer met rauwe courgette, dille en frisse gel.",
    plating:"Komkommer uit het vat, carpaccio van courgette, gel van komkommer, olie van dille en crème fraîche.",
    recipeIds:["fvat-komkommer","gcarp-courgette","ggel-komkommer","herboil2-dille","cultzuivel-cre-me-frai-che"], updatedBy:"Simon", updatedAt:"zojuist" },
  { id:"d27", name:"Erwt, lavas & tuinbloemen", course:"Zomertussengerecht", season:["Lente","Zomer"], diet:"Vegetarisch",
    description:"Zoete erwt met de bouillonachtige diepte van gefermenteerde lavas en gepekelde bloemen.",
    plating:"Espuma van erwten, geblisterde peultjes, kruidenpasta van lavas, gepekelde goudsbloem en gel van munt.",
    recipeIds:["gespuma-erwten","beanroast-peultjes","fherbpaste-lavas","pflower-goudsbloem","gherbgel-munt"], updatedBy:"Isa", updatedAt:"zojuist" },
  { id:"d28", name:"Courgettebloem, kosho & citroen", course:"Zomertussengerecht", season:["Zomer"], diet:"Vegetarisch",
    description:"Gegrilde courgette met de scherpte van tuinkosho en een gepekelde bloem.",
    plating:"Gegrilde courgette, gepekelde courgettebloem, kosho van citroen, gel van courgette en olie van munt.",
    recipeIds:["grill-courgette","pflower-courgettebloem","fkosho-citroen","ggel-courgette","gherboil-munt"], updatedBy:"Kim", updatedAt:"zojuist" },
  { id:"d29", name:"Bonen van de vuurplaats", course:"Zomertussengerecht", season:["Zomer","Herfst"], diet:"Vegetarisch",
    description:"Geblisterde bonen met aioli, gefermenteerde dragon en zoetzuur.",
    plating:"Geblisterde sperziebonen, gepekelde sperziebonen, aioli, kruidenpasta van dragon en olijvencrumble.",
    recipeIds:["beanroast-sperziebonen","gpickle-sperziebonen","mayo-aioli","fherbpaste-dragon","c-olive-crumble"], updatedBy:"Simon", updatedAt:"zojuist" },
  { id:"d30", name:"Pulled schouder, jonge zuurkool & hotsauce", course:"Zomerhoofdgerecht", season:["Zomer"], diet:"Varkensvlees",
    description:"Zomers barbecuebord van eigen varkens met jonge zuurkool en gefermenteerde tomatenhotsauce.",
    plating:"Pulled schouder, zuurkool van spitskool, hotsauce van tomaat, puree van erwten en gepekelde ui.",
    recipeIds:["pork-pulled-schouder","kraut-spitskool","fhot-tomaat","beanpuree-erwten","gpickle-ui"], updatedBy:"Michael", updatedAt:"zojuist" },
  { id:"d31", name:"Framboos, gember & citroenmelisse", course:"Zomerdessert", season:["Zomer"], diet:"Vegetarisch",
    description:"Framboos in drie temperaturen met de bruis van eigen frambozen-gemberbier.",
    plating:"Sorbet en coulis van framboos, framboos-granité, anglaise van citroenmelisse en aan tafel frambozen-gemberbier.",
    recipeIds:["gsorbet-framboos","gcoulis-framboos","granita-framboos-granite","anglaise-citroenmelisse-anglaise","gingerbeer-frambozen-gemberbier"], updatedBy:"Isa", updatedAt:"zojuist" },
  { id:"d32", name:"Blauwe bes, lavendel & honing", course:"Zomerdessert", season:["Zomer"], diet:"Vegetarisch",
    description:"Zomerbessen met bloemige lavendel uit de pluktuin.",
    plating:"Compote en sorbet van blauwe bes, lavendelganache, gekonfijte lavendel en een glaasje wilde bruis van lavendel.",
    recipeIds:["gcompote-blauwe-bes","gsorbet-blauwe-bes","ganache-lavendelganache","candyflower-lavendel","wildesoda-lavendel"], updatedBy:"Kim", updatedAt:"zojuist" },
  { id:"d33", name:"Aalbes & wilde bruis", course:"Zomerdessert", season:["Zomer"], diet:"Vegetarisch",
    description:"Zure aalbes met een wild gefermenteerde kamillebruis van eigen bloemen.",
    plating:"Sorbet en confituur van aalbes, sesamtuile, suiker van kamille en een glaasje wilde bruis van kamille.",
    recipeIds:["gsorbet-aalbes","gjam-aalbes","tuile-sesamtuile","kruidensuiker-kamille","wildesoda-kamille"], updatedBy:"Isa", updatedAt:"zojuist" },
  { id:"d34", name:"Venkel, kosho & goudsbloem", course:"Zomertussengerecht", season:["Zomer","Herfst"], diet:"Vegetarisch",
    description:"Anijsachtige venkel van de grill met citrusscherpte en bloemenazijn.",
    plating:"Gegrilde venkel, kosho van limoen, azijn van goudsbloem, carpaccio van koolrabi en olie van munt.",
    recipeIds:["grill-venkel","fkosho-limoen","fvinegar-goudsbloem","gcarp-koolrabi","gherboil-munt"], updatedBy:"Stef", updatedAt:"zojuist" },
  { id:"d56", name:"Utrechtse ui & honingmosterd", course:"Zomertussengerecht", season:["Lente","Zomer"], diet:"Vegetarisch",
    description:"De eigen Utrechtse ui, gefermenteerd en geconfijt, met zoete gefermenteerde mosterd.",
    plating:"Geconfijte en gefermenteerde Utrechtse ui, honingmosterd, gel van bieslook en olijvencrumble.",
    recipeIds:["gconfit-utrechtse-ui","lacto-utrechtse-ui","fmustard-honingmosterd","gherbgel-bieslook","c-olive-crumble"], updatedBy:"Simon", updatedAt:"zojuist" },
  { id:"d61", name:"Courgette, bonen & aioli", course:"Zomerhoofdgerecht", season:["Zomer"], diet:"Vegetarisch",
    description:"Vegetarisch zomerhoofdgerecht van de Black Bastard met knoflook in twee fermentaties.",
    plating:"Gegrilde courgette, geblisterde snijbonen, aioli, hotsauce van knoflook en pesto van oregano.",
    recipeIds:["grill-courgette","beanroast-snijbonen","mayo-aioli","fhot-knoflook","gpesto-oregano"], updatedBy:"Michael", updatedAt:"zojuist" },

  // ---------- HERFST ----------
  { id:"d35", name:"Biet, kvass & dille", course:"Herfstvoorgerecht", season:["Herfst"], diet:"Vegetarisch",
    description:"Gerookte biet met een lepel van de eigen bietenkvass — aards en licht sprankelend.",
    plating:"Gerookte rode biet, carpaccio van gele biet, lepel bietenkvass, olie van dille en balsamicoparels.",
    recipeIds:["gsmoke-rode-biet","gcarp-gele-biet","kvass-rode-biet","herboil2-dille","c-balsamic-pearls"], updatedBy:"Stef", updatedAt:"zojuist" },
  { id:"d36", name:"Pompoen, honing-knoflook & salie", course:"Herfstvoorgerecht", season:["Herfst"], diet:"Vegetarisch",
    description:"Zoete pompoen met zachte tenen honing-knoflook en herfstsalie.",
    plating:"Puree en chip van pompoen, honing-knoflook, boter van salie en zout van salie.",
    recipeIds:["vpuree-pompoen","vchip-pompoen","honingknoflook-klassieke-honing-knoflook","gbutter-salie","gsalt-salie"], updatedBy:"Kim", updatedAt:"zojuist" },
  { id:"d37", name:"Kimchi-bord uit de herfsttuin", course:"Herfsttussengerecht", season:["Herfst"], diet:"Vegetarisch",
    description:"Chinese kool op twee manieren gefermenteerd, met koriander uit de tuin.",
    plating:"Kimchi en waterkimchi van chinese kool, gefermenteerde stelen van paksoi, kruidenpasta en olie van koriander.",
    recipeIds:["kimchi-chinese-kool","dongchimi-chinese-kool","fstem-paksoi","fherbpaste-koriander","gherboil-koriander"], updatedBy:"Stef", updatedAt:"zojuist" },
  { id:"d38", name:"Kweepeer, cider & laurier", course:"Herfstdessert", season:["Herfst"], diet:"Vegetarisch",
    description:"Gepocheerde kweepeer met eigen kweeperencider en karamel.",
    plating:"Gepocheerde kweepeer, poeder van kweepeer, karamel, anglaise van laurier en een glaasje cider van kweepeer.",
    recipeIds:["gpoach-kweepeer","gdry-kweepeer","caramel-klassieke-karamel","anglaise-laurier-anglaise","cider-kweepeer"], updatedBy:"Isa", updatedAt:"zojuist" },
  { id:"d39", name:"Druif, landwijn & walnoot", course:"Herfstdessert", season:["Herfst"], diet:"Vegetarisch",
    description:"Druiven van eigen stok, van granité tot landwijn.",
    plating:"Gepocheerde druif, druiven-granité, coulis van druif, crumble van walnoot en een glaasje landwijn van druif.",
    recipeIds:["gpoach-druif","granita-druiven-granite","gcoulis-druif","crumble-walnoot","landwijn-druif"], updatedBy:"Kim", updatedAt:"zojuist" },
  { id:"d40", name:"Procureur, appel & levende azijn", course:"Herfsthoofdgerecht", season:["Herfst","Winter"], diet:"Varkensvlees",
    description:"Langzaam gegaarde procureur met appel en de eigen levende appelazijn.",
    plating:"Gegaarde procureur, compote van appel, levende azijn van appel door de jus, puree van knolselderij en portjus.",
    recipeIds:["pork-gegaarde-procureur","gcompote-appel","fruitazijnlevend-appel","gpuree-knolselderij","jus-portjus"], updatedBy:"Michael", updatedAt:"zojuist" },
  { id:"d42", name:"Amsoi, kimchi & sesam", course:"Herfsttussengerecht", season:["Herfst"], diet:"Vegetarisch",
    description:"Mosterdachtige amsoi, scherp gefermenteerd, met salieboter en sesam.",
    plating:"Kimchi en gefermenteerde amsoi, boter van salie, hotsauce van ui en sesamtuile.",
    recipeIds:["kimchi-amsoi","lacto-amsoi","gbutter-salie","fhot-ui","tuile-sesamtuile"], updatedBy:"Simon", updatedAt:"zojuist" },
  { id:"d43", name:"Wortel, zoutpruim & dragon", course:"Herfsttussengerecht", season:["Herfst"], diet:"Vegetarisch",
    description:"Zoete geroosterde wortel met het umami-zuur van zoutpruimen van reine claude.",
    plating:"Geroosterde wortel, espuma en chip van wortel, fijngehakte zoutpruim van reine claude en kruidenpasta van dragon.",
    recipeIds:["roast-wortel","gespuma-wortel","gchip-wortel","zoutpruim-reine-claude","fherbpaste-dragon"], updatedBy:"Kim", updatedAt:"zojuist" },
  { id:"d44", name:"Appelschil & karnemelk", course:"Herfstdessert", season:["Herfst","Winter"], diet:"Vegetarisch",
    description:"Zero waste: schillenbrouwsel van appel met eigen karnemelk en fruitleer.",
    plating:"Compote van appel, karnemelk-ijsschaafsel, fruitleer van appel, suiker van tijm en een glaasje schillenbrouwsel van appel.",
    recipeIds:["gcompote-appel","cultzuivel-karnemelk","fleather-appel","kruidensuiker-tijm","tepache-appel"], updatedBy:"Isa", updatedAt:"zojuist" },
  { id:"d57", name:"Krokante krosse & zuren", course:"Herfstvoorgerecht", season:["Herfst","Winter"], diet:"Varkensvlees",
    description:"Krokant van eigen varkens met gefermenteerde en gepekelde zuren ertegenover.",
    plating:"Krokante krosse, bietenmosterd, gepekelde ui, hotsauce van ui en mosterdmayonaise.",
    recipeIds:["pork-krokante-krosse","fmustard-bietenmosterd","gpickle-ui","fhot-ui","mayo-mosterdmayonaise"], updatedBy:"Michael", updatedAt:"zojuist" },
  { id:"d62", name:"Herfstbord van het land", course:"Herfsthoofdgerecht", season:["Herfst"], diet:"Vegetarisch",
    description:"Vegetarisch herfsthoofdgerecht: biet, pompoen en zuurkool met beurre rouge.",
    plating:"Geroosterde rode biet, puree van pompoen, zuurkool van rode kool, crumble van hazelnoot en beurre rouge.",
    recipeIds:["roast-rode-biet","vpuree-pompoen","kraut-rode-kool","crumble-hazelnoot","beurreblanc-beurre-rouge"], updatedBy:"Simon", updatedAt:"zojuist" },
  { id:"d65", name:"Fermentenbord van het land", course:"Herfstvoorgerecht", season:["Herfst"], diet:"Vegetarisch",
    description:"Proeverij van het fermentatievat: vijf huisgemaakte fermenten om te delen.",
    plating:"Gefermenteerde venkel, komkommer uit het vat, kimchi van koolrabi, hotsauce van rode biet en gefermenteerde mosterd.",
    recipeIds:["lacto-venkel","fvat-komkommer","kimchi-koolrabi","fhot-rode-biet","fmustard-klassieke-gefermenteerde-mosterd"], updatedBy:"Stef", updatedAt:"zojuist" },

  // ---------- WINTER ----------
  { id:"d41", name:"Sukade, kardoen & mosterd", course:"Winterhoofdgerecht", season:["Winter"], diet:"Rundvlees",
    description:"Gesmoorde sukade met gefermenteerde kardoenstelen en eigen mosterd.",
    plating:"Gesmoorde sukade, gefermenteerde stelen van kardoen, puree van pastinaak, gefermenteerde mosterd en rodewijnjus.",
    recipeIds:["beef-gesmoorde-sukade","fstem-kardoen","gpuree-pastinaak","fmustard-klassieke-gefermenteerde-mosterd","jus-rodewijnjus"], updatedBy:"Michael", updatedAt:"zojuist" },
  { id:"d45", name:"Varkenswang, zuurkool & aardappel", course:"Winterhoofdgerecht", season:["Winter"], diet:"Varkensvlees",
    description:"Zachte varkenswang in eigen jus met savooizuurkool en bietenmosterd.",
    plating:"Varkenswang in eigen jus, zuurkool van savooikool, puree van aardappel, bietenmosterd en tijm-knoflookjus.",
    recipeIds:["pork-varkenswang-in-eigen-jus","kraut-savooikool","vpuree-aardappel","fmustard-bietenmosterd","jus-tijm-knoflookjus"], updatedBy:"Michael", updatedAt:"zojuist" },
  { id:"d46", name:"Groenlof, peer & walnoot", course:"Wintervoorgerecht", season:["Winter"], diet:"Vegetarisch",
    description:"Bittere groenlof met zoete peer en de eigen levende perenazijn in de dressing.",
    plating:"Blaadjes groenlof, gepocheerde peer, levende azijn van peer in de honing-mosterdvinaigrette en crumble van walnoot.",
    recipeIds:["gpoach-peer","fruitazijnlevend-peer","vinaigrette-honing-mosterdvinaigrette","crumble-walnoot"], updatedBy:"Stef", updatedAt:"zojuist" },
  { id:"d47", name:"Winterkoolbord", course:"Wintertussengerecht", season:["Winter"], diet:"Vegetarisch",
    description:"Boerenkool in texturen met gefermenteerde biet en geconfijte knoflook.",
    plating:"Puree en chip van boerenkool, gefermenteerde boerenkool, hotsauce van rode biet en geconfijte knoflook.",
    recipeIds:["gpuree-boerenkool","gchip-boerenkool","lacto-boerenkool","fhot-rode-biet","gconfit-knoflook"], updatedBy:"Kim", updatedAt:"zojuist" },
  { id:"d48", name:"Pastinaak, honing-knoflook & tijm", course:"Wintertussengerecht", season:["Herfst","Winter"], diet:"Vegetarisch",
    description:"Zoete pastinaak met tijm-honing-knoflook en beurre blanc.",
    plating:"Geroosterde pastinaak, puree en chip van pastinaak, honing-knoflook met tijm en beurre blanc.",
    recipeIds:["roast-pastinaak","gpuree-pastinaak","gchip-pastinaak","honingknoflook-honing-knoflook-met-tijm","beurreblanc-klassieke-beurre-blanc"], updatedBy:"Simon", updatedAt:"zojuist" },
  { id:"d49", name:"Veldsla, biet & hazelnoot", course:"Wintervoorgerecht", season:["Winter"], diet:"Vegetarisch",
    description:"Winterse salade van veldsla met biet in twee bereidingen en gefermenteerde ui.",
    plating:"Veldsla, carpaccio en geconfijte rode biet, gefermenteerde ui, sjalottenvinaigrette en crumble van hazelnoot.",
    recipeIds:["gcarp-rode-biet","gconfit-rode-biet","lacto-ui","vinaigrette-sjalottenvinaigrette","crumble-hazelnoot"], updatedBy:"Isa", updatedAt:"zojuist" },
  { id:"d50", name:"Knolselderij in het geheel", course:"Winterhoofdgerecht", season:["Winter"], diet:"Vegetarisch",
    description:"Vegetarisch winterhoofdgerecht: knolselderij geroosterd, gerookt en als kvass.",
    plating:"Geroosterde en gerookte knolselderij, lepel knolselderijkvass, mosterd-beurre blanc en zout van rozemarijn.",
    recipeIds:["roast-knolselderij","gsmoke-knolselderij","kvass-knolselderij","beurreblanc-mosterd-beurre-blanc","gsalt-rozemarijn"], updatedBy:"Simon", updatedAt:"zojuist" },
  { id:"d51", name:"Short rib & gefermenteerde ui", course:"Winterhoofdgerecht", season:["Herfst","Winter"], diet:"Rundvlees",
    description:"Short rib van het bot met ui in twee fermentaties en aardpeer.",
    plating:"Short rib van het bot, gefermenteerde ui, hotsauce van ui, puree van aardpeer en rodewijnjus.",
    recipeIds:["beef-short-rib-van-het-bot","lacto-ui","fhot-ui","gpuree-aardpeer","jus-rodewijnjus"], updatedBy:"Michael", updatedAt:"zojuist" },
  { id:"d52", name:"Mispel, karamel & laurier", course:"Winterdessert", season:["Herfst","Winter"], diet:"Vegetarisch",
    description:"Vergeten fruit: mispel met gezouten karamel en laurier.",
    plating:"Gepocheerde mispel, compote van mispel, gezouten karamel afgeblust met levende appelazijn, anglaise van laurier en boekweittuile.",
    recipeIds:["gpoach-mispel","gcompote-mispel","caramel-gezouten-karamel","fruitazijnlevend-appel","anglaise-laurier-anglaise","tuile-boekweittuile"], updatedBy:"Isa", updatedAt:"zojuist" },
  { id:"d53", name:"Winterappel & cider", course:"Winterdessert", season:["Herfst","Winter"], diet:"Vegetarisch",
    description:"Appel van de boomgaard met karamelroomijs en eigen cider.",
    plating:"Gepocheerde appel, karamel-roomijs, fruitchip van appel, kaneelbanketbakkersroom en een glaasje cider van appel.",
    recipeIds:["gpoach-appel","icecream-karamel-roomijs","fchip-appel","patissiere-kaneelbanketbakkersroom","cider-appel"], updatedBy:"Kim", updatedAt:"zojuist" },
  { id:"d54", name:"Bloedsinaasappel in de winter", course:"Winterdessert", season:["Winter"], diet:"Vegetarisch",
    description:"Winterzon op het bord: bloedsinaasappel met pistache en een streep kombucha-azijn.",
    plating:"Mousse, sorbet en gel van bloedsinaasappel, crumble van pistache en een streep kombucha-azijn.",
    recipeIds:["mousse-bloedsinaasappel","sorbet-bloedsinaasappel","gel-bloedsinaasappel","crumble-pistache","kombuchaazijn-klassieke-kombucha-azijn"], updatedBy:"Isa", updatedAt:"zojuist" },
  { id:"d58", name:"Kardoen & beurre blanc", course:"Wintertussengerecht", season:["Herfst","Winter"], diet:"Vegetarisch",
    description:"Vergeten groente kardoen, geroosterd en gefermenteerd, met klassieke botersaus.",
    plating:"Geroosterde kardoen, gefermenteerde stelen van kardoen, beurre blanc, olijvencrumble en zout van tijm.",
    recipeIds:["roast-kardoen","fstem-kardoen","beurreblanc-klassieke-beurre-blanc","c-olive-crumble","gsalt-tijm"], updatedBy:"Stef", updatedAt:"zojuist" },
  { id:"d59", name:"Chioggia, yuzu-kosho & rozemarijn", course:"Wintervoorgerecht", season:["Winter"], diet:"Vegetarisch",
    description:"Gestreepte chioggia met de winterse scherpte van yuzu-kosho.",
    plating:"Carpaccio van chioggia biet, geconfijte rode biet, kosho van yuzu, olie van waterkers en zout van rozemarijn.",
    recipeIds:["gcarp-chioggia-biet","gconfit-rode-biet","fkosho-yuzu","herboil2-waterkers","gsalt-rozemarijn"], updatedBy:"Kim", updatedAt:"zojuist" },
  { id:"d60", name:"Gelakte buik, kimchi & pinda", course:"Winterhoofdgerecht", season:["Winter"], diet:"Varkensvlees",
    description:"Winterse buik van eigen varkens met rodekoolkimchi en pindacrunch.",
    plating:"Gelakte buik, kimchi van rode kool, puree van zoete aardappel, crumble van pinda en peperjus.",
    recipeIds:["pork-gelakte-buik","kimchi-rode-kool","vpuree-zoete-aardappel","crumble-pinda","jus-peperjus"], updatedBy:"Michael", updatedAt:"zojuist" },
  { id:"d63", name:"Peer, ganache & walnoot", course:"Winterdessert", season:["Herfst","Winter"], diet:"Vegetarisch",
    description:"Gepocheerde peer met pure ganache en walnoot uit de herfstvoorraad.",
    plating:"Gepocheerde peer, pure ganache, pasta van walnoot, vanille-roomijs en een glaasje cider van peer.",
    recipeIds:["gpoach-peer","ganache-pure-ganache","nutpaste-walnoot","icecream-vanille-roomijs","cider-peer"], updatedBy:"Isa", updatedAt:"zojuist" },
  { id:"d66", name:"Wortel, kvass & gember", course:"Wintertussengerecht", season:["Winter"], diet:"Vegetarisch",
    description:"Winterwortel met wortelkvass en een warme gemberbiersaus.",
    plating:"Puree en chip van wortel, lepel wortelkvass, ingekookte saus van klassiek gemberbier en kruidenpasta van koriander.",
    recipeIds:["gpuree-wortel","gchip-wortel","kvass-wortel","gingerbeer-klassiek-gemberbier","fherbpaste-koriander"], updatedBy:"Simon", updatedAt:"zojuist" },
];

const PAIRINGS = [
  { name:"rode biet", pairs:["geitenkaas","appel","walnoot","dille","sinaasappel","mierikswortel","dragon"], note:"Aards en zoet; houdt van zuur en noot." },
  { name:"tomaat", pairs:["basilicum","mozzarella","olijf","knoflook","ui","oregano","aardbei"], note:"Zomers, zuur en umami." },
  { name:"aardbei", pairs:["rabarber","basilicum","balsamico","zwarte peper","room","munt"], note:"Zoet met tegenwicht van zuur en peper." },
  { name:"courgette", pairs:["munt","citroen","knoflook","feta","tijm","courgettebloem"], note:"Mild; leunt op kruid en zuur." },
  { name:"venkel", pairs:["sinaasappel","appel","dille","citroen","varkensvlees"], note:"Anijs; fris citrus en zoet." },
  { name:"appel", pairs:["kaneel","kweepeer","karamel","walnoot","salie","varkensvlees","rode kool"], note:"Zoetzuur; klassiek bij varken en kool." },
  { name:"peer", pairs:["blauwe kaas","walnoot","chocolade","tijm","rode wijn"], note:"Zoet en bloemig." },
  { name:"rode kool", pairs:["appel","kaneel","ui","kruidnagel","varkensvlees"], note:"Zoetzuur winters." },
  { name:"boerenkool", pairs:["knoflook","citroen","chili","aardappel","varkensvlees"], note:"Stevig en aards." },
  { name:"pastinaak", pairs:["honing","tijm","appel","hazelnoot","nootmuskaat"], note:"Zoet en nootachtig." },
  { name:"wortel", pairs:["komijn","sinaasappel","gember","koriander","honing"], note:"Zoet; warme specerijen." },
  { name:"knolselderij", pairs:["appel","mosterd","truffel","hazelnoot","tijm"], note:"Nootachtig en romig." },
  { name:"rabarber", pairs:["aardbei","gember","vanille","sinaasappel","room"], note:"Scherp zuur; zoet nodig." },
  { name:"braam", pairs:["appel","vanille","tijm","chocolade","laurier"], note:"Donker en zoetzuur." },
  { name:"framboos", pairs:["chocolade","rozemarijn","lychee","room","amandel"], note:"Fris zuur; goed bij chocolade." },
  { name:"pruim", pairs:["amandel","kaneel","laurier","rode wijn","salie"], note:"Zoet en warm." },
  { name:"druif", pairs:["walnoot","blauwe kaas","rozemarijn","varkensvlees"], note:"Zoet; goed bij kaas." },
  { name:"kweepeer", pairs:["appel","peer","vanille","laurier","varkensvlees"], note:"Parfumig; wil pocheren." },
  { name:"erwten", pairs:["munt","citroen","ricotta","dragon"], note:"Zoet en fris." },
  { name:"sperziebonen", pairs:["knoflook","tomaat","bonenkruid","amandel"], note:"Knapperig en groen." },
  { name:"radijs", pairs:["boter","zout","citroen","dille"], note:"Peperig; boter en zuur." },
  { name:"komkommer", pairs:["dille","munt","yoghurt","citroen"], note:"Fris en waterig." },
  { name:"ui", pairs:["tijm","laurier","azijn","kaas"], note:"Zoet bij karamelliseren." },
  { name:"knoflook", pairs:["tijm","olijfolie","peterselie","citroen"], note:"Basis; zacht confijten." },
  { name:"munt", pairs:["erwten","aardbei","komkommer","chocolade","lam"], note:"Fris; zoet en groen." },
  { name:"dille", pairs:["rode biet","komkommer","mosterd","citroen"], note:"Anijsachtig; bij biet en zuur." },
  { name:"dragon", pairs:["ei","citroen","venkel","mosterd"], note:"Anijs; klassiek in emulsies." },
  { name:"oost-indische kers", pairs:["zachte kaas","komkommer","ei","radijs"], note:"Peperig blad en bloem." },
  { name:"varkensvlees", pairs:["appel","venkel","salie","mosterd","kweepeer","rode kool"], note:"Vet vraagt zuur en zoet." },
  { name:"rundvlees", pairs:["ui","tijm","rode wijn","mierikswortel","wortel"], note:"Krachtig; umami en pit." },
  { name:"aalbes", pairs:["wild","room","vanille","munt","witte chocolade"], note:"Fris-zuur; mooi bij wild en room." },
  { name:"savooikool", pairs:["spek","ui","nootmuskaat","aardappel","kastanje"], note:"Zacht en aards; wintergroente." },
  { name:"spitskool", pairs:["karwij","boter","spek","mosterd","appel"], note:"Fijn en zoet; snel gaar." },
  { name:"koolrabi", pairs:["appel","mosterd","dille","ham","mierikswortel"], note:"Fris en knapperig, rauw of gestoomd." },
  { name:"snijbiet", pairs:["knoflook","rozijn","pijnboompit","citroen","ricotta"], note:"Aards blad, stevige steel." },
  { name:"chioggia biet", pairs:["geitenkaas","sinaasappel","walnoot","dille","honing"], note:"Mild en zoet; mooi rauw voor de ringen." },
  { name:"gele biet", pairs:["venkel","sinaasappel","tijm","geitenkaas","walnoot"], note:"Zachter en zoeter dan rode biet." },
  { name:"palmkool", pairs:["knoflook","ansjovis","chili","pecorino","witte bonen"], note:"Diep en aards; houdt van pit." },
  { name:"andijvie", pairs:["spek","ui","mosterd","aardappel","ei"], note:"Bitter blad; vraagt vet en zoet." },
  { name:"bindsla", pairs:["radijs","ei","bieslook","mosterd"], note:"Zachte kropsla; luchtige dressing." },
  { name:"rucola", pairs:["parmezaan","citroen","pijnboompit","tomaat","balsamico"], note:"Peperig; zuur en zout in balans." },
  { name:"japanse wijnbes", pairs:["room","vanille","honing","citroen"], note:"Zoetzurige bes; simpel houden." },
  { name:"utrechtse ui", pairs:["ei","boter","kruiden","aardappel"], note:"Milde bosui; rauw als afwerking." },
  { name:"bieslook", pairs:["ei","aardappel","zure room","vis","kaas"], note:"Zachte ui; rauw op het laatst." },
  { name:"peterselie", pairs:["knoflook","citroen","boter","vis","ui"], note:"Fris groen; gremolata." },
  { name:"rozemarijn", pairs:["lam","aardappel","knoflook","citroen","honing"], note:"Krachtig hars; met mate." },
  { name:"tijm", pairs:["ui","paddenstoel","citroen","wortel","gevogelte"], note:"Aards en warm; verdraagt lang garen." },
  { name:"laurier", pairs:["tomaat","peulvrucht","room","wild","melk"], note:"Achtergrondkruid; trekt in vocht." },
  { name:"lavas", pairs:["aardappel","ei","bouillon","tomaat","selderij"], note:"Maggi-achtig; krachtig, dus doseren." },
  { name:"citroenmelisse", pairs:["aardbei","perzik","room","honing","thee"], note:"Citrusblad; fris in zoet." },
  { name:"salie", pairs:["varkensvlees","boter","pompoen","appel","witte bonen"], note:"Warm en wat bitter; met bruine boter." },
  { name:"uiensoepboom", pairs:["aardappel","ei","boter","kaas"], note:"Blad met uiensmaak; als bieslook gebruiken." },
  { name:"mispel", pairs:["appel","peer","kaneel","room","walnoot"], note:"Rijp (bletted); zoet en moutig." },
  { name:"courgettebloem", pairs:["ricotta","citroen","munt","parmezaan"], note:"Delicaat; vullen en frituren." },
  { name:"meiknol", pairs:["boter","dragon","citroen","ei"], note:"Jonge meiraap; fijn en zoet." },
  { name:"amaranth", pairs:["knoflook","citroen","tomaat","sesam"], note:"Blad als spinazie; zaad als graan." },
  { name:"rode eikenbladsla", pairs:["walnoot","peer","blauwe kaas","sjalot"], note:"Zachte bittere sla; noot en fruit." },
  { name:"paksoi", pairs:["knoflook","gember","sojasaus","sesam","chili"], note:"Knapperige steel; kort roerbakken." },
  { name:"goudsbloem", pairs:["rijst","wortel","ei","boter"], note:"Arme-mans-saffraan; kleur en mild." },
  { name:"korenbloem", pairs:["komkommer","kaas","citroen"], note:"Vooral kleur; mild zoetig." },
  { name:"dahlia", pairs:["hazelnoot","boter","appel"], note:"Knol nootachtig als aardappel; bloem decoratief." },
  { name:"leeuwenbek", pairs:["salade","kruiden","citroen"], note:"Eetbare bloem; licht bitter, als garnituur." },
  { name:"kamille", pairs:["appel","honing","room","peer","vanille"], note:"Bloemig-appelig; in zoet en thee." },
  { name:"lavendel", pairs:["honing","citroen","bosvruchten","chocolade"], note:"Sterk parfum; heel spaarzaam." },
  { name:"afrikaantjes", pairs:["citrus","wortel","tomaat"], note:"Citrus-anijs blad; als kruid en kleur." },
  { name:"princessenbonen", pairs:["knoflook","boter","bonenkruid","amandel","sjalot"], note:"Fijne boon; kort garen." },
  { name:"snijbonen", pairs:["spek","ui","tomaat","bonenkruid"], note:"Stevig; goed in stoof." },
  { name:"pronkbonen", pairs:["tomaat","knoflook","spek","salie"], note:"Grote boon; hartige begeleiders." },
  { name:"peultjes", pairs:["munt","boter","citroen","sesam"], note:"Zoet en knapperig; kort." },
  { name:"kapucijners", pairs:["spek","ui","augurk","mosterd"], note:"Stevige peul; klassiek Hollands." },
  { name:"ijsbergsla", pairs:["tomaat","ui","yoghurt","citroen"], note:"Knapperig en neutraal; frisse dressing." },
  { name:"veldsla", pairs:["walnoot","spek","ei","sjalot","biet"], note:"Zacht en nootachtig; wintersalade." },
  { name:"rode melde", pairs:["knoflook","citroen","ei"], note:"Als spinazie; kleurt mooi." },
  { name:"oregano", pairs:["tomaat","olijfolie","knoflook","courgette","kaas"], note:"Zuiders; gedroogd sterker." },
  { name:"reine claude", pairs:["amandel","vanille","honing","laurier"], note:"Zoete groene pruim; simpel houden." },
  { name:"tuinzuring", pairs:["ei","vis","room","aardappel"], note:"Citroenzuur blad; snijdt door vet." },
  { name:"koriander", pairs:["limoen","chili","knoflook","komijn","kokos"], note:"Fris; blad laat toevoegen." },
  { name:"blauwe bes", pairs:["citroen","vanille","room","kaneel","munt"], note:"Zoet; wil zuur en vanille." },
  { name:"aardpeer", pairs:["hazelnoot","tijm","citroen","ui","spek"], note:"Nootachtig zoet; puree of chip." },
  { name:"aardpeer bloem", pairs:["garnituur","honing"], note:"Zonnebloemachtige bloem; decoratief." },
  { name:"spinazie", pairs:["knoflook","nootmuskaat","room","ei","citroen"], note:"Mild blad; room en muskaat." },
  { name:"chinese kool", pairs:["gember","knoflook","sojasaus","chili"], note:"Zacht; rauw of fermenteren (kimchi)." },
  { name:"amsoi", pairs:["knoflook","sojasaus","gember","sesam"], note:"Mosterdachtig blad; roerbak." },
  { name:"kardoen", pairs:["parmezaan","boter","ansjovis","citroen"], note:"Artisjokachtig; blancheren tegen bitter." },
  { name:"bleekselderij", pairs:["appel","walnoot","blauwe kaas","ui"], note:"Fris en zoutig; rauw of fond." },
  { name:"groenlof", pairs:["sinaasappel","blauwe kaas","walnoot","honing"], note:"Bitter; zoet en zout eroverheen." },
  { name:"madelief", pairs:["salade","kruiden"], note:"Madeliefje; milde eetbare bloem als garnituur." },
];

const seedBatches = [
  { id:"b1", product:"Zuurkool van rode kool", type:"Zuurkool", startDate:"2026-07-08", days:21, saltPct:2.5, tempC:20, amount:"3 kg", pH:3.6, notes:"Mooie zuurgraad, bijna klaar.", done:false, by:"Simon" },
  { id:"b2", product:"Kimchi van chinese kool", type:"Kimchi", startDate:"2026-07-16", days:5, saltPct:2.5, tempC:21, amount:"2 kg", pH:4.2, notes:"Dag 5, begint te bruisen.", done:false, by:"Stef" },
  { id:"b3", product:"Gefermenteerde knoflook-hotsauce", type:"Hotsauce", startDate:"2026-06-20", days:14, saltPct:2.5, tempC:22, amount:"1,5 kg", pH:3.4, notes:"Afgerond en gebotteld.", done:true, by:"Michael" },
];

// ---------- helpers ----------
function scaleAmount(str, f) {
  if (f === 1 || !str) return str;
  const frac = { "½":0.5,"¼":0.25,"¾":0.75,"⅓":1/3,"⅔":2/3,"⅛":0.125 };
  const m = str.match(/\d+(?:[.,]\d+)?/);
  if (m) {
    const val = parseFloat(m[0].replace(",", ".")) * f;
    let out = Math.round(val * 100) / 100;
    return str.slice(0, m.index) + String(out).replace(".", ",") + str.slice(m.index + m[0].length);
  }
  const fc = Object.keys(frac).find((k) => str.includes(k));
  if (fc) {
    let out = Math.round(frac[fc] * f * 100) / 100;
    return str.replace(fc, String(out).replace(".", ","));
  }
  return str;
}
function roleLabel(role) {
  return { chef: "Chef", souschef: "Souschef", kok: "Zelfstandig kok",
           leerling: "Leerling kok", hulpkok: "Hulpkok", guest: "Gast" }[role] || role;
}
function daysBetween(iso) {
  const d = new Date(iso); if (isNaN(d)) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}


// ---------- huisstijl (Landgoed de Beug) ----------
const T = { paper:"#f2f0e8", green:"#3a4b30", ink:"#2b3823", line:"#e3e0d4" };
const serif = { fontFamily: "'Cormorant Garamond', Georgia, 'Times New Roman', serif" };
const inputCls = "input px-3 py-2.5 placeholder:text-neutral-400";
const seasonStyle = {
  Lente:{ background:"#e4ecdc", color:"#3f5a34" },
  Zomer:{ background:"#f1ead2", color:"#7a6420" },
  Herfst:{ background:"#efe0d3", color:"#8a5a34" },
  Winter:{ background:"#dfe6e6", color:"#3f5560" },
};

function BrandCSS() {
  return (
    <style>{`
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&display=swap');
.serif{font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif}
.ink{color:#2b3823}.mute{color:#6f7263}.acc{color:#3a4b30}
.ff:focus{outline:none}
.ff:focus-visible{outline:none;box-shadow:0 0 0 2px #3a4b30}
.card{background:#fff;border:1px solid #e3e0d4;border-radius:14px}
.cardh{transition:border-color .15s}.cardh:hover{border-color:#8fa07d}
.btnp{background:#3a4b30;color:#f4f2ea;transition:background .15s}.btnp:hover{background:#2b3823}
.btno{border:1px solid #d8d5c8;color:#3a4b30;background:#fff;transition:border-color .15s,color .15s}.btno:hover{border-color:#3a4b30}
.pill{background:#e8ebe0;color:#565a4b;transition:color .15s}.pill:hover{color:#2b3823}
.pillon{background:#3a4b30;color:#f4f2ea}
.chip{background:#eceadf;color:#5b5e4f}
.tintbox{background:#eef1e7;border:1px solid #e0e5d6}
.input{width:100%;border:1px solid #d8d5c8;background:#fff;border-radius:10px;font-size:14px;color:#33352c}
.input:focus{outline:none;box-shadow:0 0 0 2px #3a4b30;border-color:#3a4b30}
.divi{border-top:1px solid #ece9dd}
::selection{background:#dfe4d3}
`}</style>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [section, setSection] = useState("gerechten");
  const [recipes, setRecipes] = useState(initialRecipes);
  const [dishes, setDishes] = useState(seedDishes);
  const [batches, setBatches] = useState(seedBatches);
  const [stack, setStack] = useState([{ screen: "list" }]);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [pairings, setPairings] = useState(PAIRINGS);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBip = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    const onInstalled = () => { setInstalled(true); setDeferredPrompt(null); };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    try { if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) setInstalled(true); } catch (e) {}
    try { if (window.navigator && window.navigator.standalone) setInstalled(true); } catch (e) {}
    return () => { window.removeEventListener("beforeinstallprompt", onBip); window.removeEventListener("appinstalled", onInstalled); };
  }, []);
  const doInstall = async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); try { await deferredPrompt.userChoice; } catch (e) {} setDeferredPrompt(null); };

  // ---------- Supabase: sessie volgen ----------
  const live = !!supabase; // zonder sleutels draait de app als demo
  useEffect(() => {
    if (!live) return;
    let alive = true;
    const applySession = async (session) => {
      if (!alive) return;
      if (!session) { setUser(null); return; }
      const { data } = await supabase.from("profiles").select("name, role").eq("id", session.user.id).single();
      if (!alive) return;
      const role = data?.role || "guest";
      setUser({ name: data?.name || "Gast", role: roleLabel(role), canEdit: role !== "guest" });
    };
    supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => applySession(session));
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [live]);

  // ---------- Supabase: gedeelde laag laden + live meekijken ----------
  const loadShared = async () => {
    if (!live) return;
    const [ov, cu, en, pk, di, ba, hi, fp, dh] = await Promise.all([
      supabase.from("recipe_overrides").select("*"),
      supabase.from("recipes_custom").select("*"),
      supabase.from("recipe_endorsements").select("*"),
      supabase.from("recipe_picks").select("*"),
      supabase.from("dishes").select("*"),
      supabase.from("ferment_batches").select("*").order("created_at", { ascending: false }),
      supabase.from("recipe_hidden").select("recipe_id"),
      supabase.from("flavor_pairings").select("*"),
      supabase.from("dish_hidden").select("dish_id"),
    ]);
    let recs = [...initialRecipes];
    const ovMap = new Map((ov.data || []).map((r) => [r.id, r.data]));
    recs = recs.map((r) => (ovMap.has(r.id) ? { ...r, ...ovMap.get(r.id) } : r));
    recs = [...(cu.data || []).map((r) => r.data), ...recs];
    const byRec = {};
    (en.data || []).forEach((e) => { (byRec[e.recipe_id] = byRec[e.recipe_id] || []).push(e.user_name); });
    recs = recs.map((r) => ({ ...r, endorsements: byRec[r.id] || [] }));
    const picks = new Set((pk.data || []).map((p) => p.recipe_id));
    recs = recs.map((r) => ({ ...r, chefsPick: picks.has(r.id) }));
    const hidden = new Set((hi.data || []).map((h) => h.recipe_id));
    recs = recs.filter((r) => !hidden.has(r.id));
    setRecipes(recs);
    const fpRows = fp.data || [];
    const fpMap = new Map(fpRows.map((x) => [x.name, x]));
    setPairings([
      ...PAIRINGS.map((p) => fpMap.has(p.name) ? { name: p.name, pairs: fpMap.get(p.name).pairs || [], note: fpMap.get(p.name).note || "" } : p),
      ...fpRows.filter((x) => !PAIRINGS.some((p) => p.name === x.name)).map((x) => ({ name: x.name, pairs: x.pairs || [], note: x.note || "" })),
    ]);
    const dbDishes = (di.data || []).map((d) => ({
      id: d.id, name: d.name, course: d.course, description: d.description, plating: d.plating,
      recipeIds: d.recipe_ids || [], season: d.season || [], diet: d.diet || "Vegetarisch",
      updatedBy: d.updated_by || "—", updatedAt: "opgeslagen",
    }));
    // Samenvoegen: nieuwe gerechten uit de database bovenaan, de startgerechten
    // blijven staan (met eventuele bewerkingen uit de database eroverheen).
    const hiddenDishes = new Set((dh.data || []).map((x) => x.dish_id));
    setDishes([
      ...dbDishes.filter((d) => !seedDishes.some((sd) => sd.id === d.id)),
      ...seedDishes.map((sd) => dbDishes.find((d) => d.id === sd.id) || sd),
    ].filter((d) => !hiddenDishes.has(d.id)));
    setBatches((ba.data || []).map((b) => ({
      id: b.id, product: b.product, type: b.type, startDate: b.start_date, days: b.days,
      saltPct: Number(b.salt_pct), tempC: Number(b.temp_c), amount: b.amount,
      pH: b.ph === null ? null : Number(b.ph), notes: b.notes || "", done: !!b.done, by: b.by || "—",
    })));
  };
  useEffect(() => {
    if (!live || !user) return;
    loadShared();
    const ch = supabase.channel("gedeeld")
      .on("postgres_changes", { event: "*", schema: "public" }, () => loadShared())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [live, !!user]);

  const current = stack[stack.length - 1];
  const push = (s) => { setStack((st) => [...st, s]); try { window.history.pushState({ app: "ritme" }, ""); } catch (e) {} };
  const back = () => setStack((st) => (st.length > 1 ? st.slice(0, -1) : st));
  const resetTo = (s) => setStack([s]);
  const goBack = () => { if (stack.length > 1) { try { window.history.back(); } catch (e) { back(); } } };
  const goHome = () => { resetTo({ screen: "list" }); setSection("gerechten"); };
  useEffect(() => {
    const onPop = () => setStack((st) => (st.length > 1 ? st.slice(0, -1) : st));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const recipeById = (id) => recipes.find((r) => r.id === id);
  const dishById = (id) => dishes.find((d) => d.id === id);
  const usageCount = (id) => dishes.filter((d) => d.recipeIds.includes(id)).length;
  const variationsOf = (id) => recipes.filter((r) => r.baseId === id);
  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };
  const canEdit = !!user && user.canEdit;

  const dbFail = (error) => { if (error) flash("Opslaan lukte niet — probeer opnieuw"); return !!error; };

  const saveRecipe = async (data, editingId) => {
    const stamped = { ...data, updatedBy: user.name, updatedAt: "zojuist" };
    if (editingId) {
      const existing = recipes.find((r) => r.id === editingId);
      const merged = { ...existing, ...stamped };
      if (live) {
        const table = existing && existing.custom ? "recipes_custom" : "recipe_overrides";
        const { error } = await supabase.from(table).upsert({ id: editingId, data: merged, updated_by: user.name, updated_at: new Date().toISOString() });
        if (dbFail(error)) return;
      }
      setRecipes((rs) => rs.map((r) => (r.id === editingId ? merged : r)));
    } else {
      const rec = { ...stamped, id: "r" + Date.now(), endorsements: [], chefsPick: false, baseId: null, isBase: false,
        season: stamped.season && stamped.season.length ? stamped.season : ["Hele jaar"], garden: false,
        diet: stamped.diet || "Vegetarisch", ferment: !!stamped.ferment,
        fermentMethod: stamped.ferment ? (stamped.fermentMethod || "Melkzuur") : null,
        fermentDefaults: stamped.ferment ? (stamped.fermentDefaults || null) : null, custom: true };
      if (live) {
        const { error } = await supabase.from("recipes_custom").upsert({ id: rec.id, data: rec, updated_by: user.name, updated_at: new Date().toISOString() });
        if (dbFail(error)) return;
      }
      setRecipes((rs) => [rec, ...rs]);
    }
    flash(live ? "Opgeslagen — zichtbaar voor het hele team" : "Opgeslagen (demo: alleen op dit apparaat)");
  };
  const saveDish = async (data, editingId) => {
    const stamped = { ...data, updatedBy: user.name, updatedAt: "zojuist" };
    const id = editingId || "d" + Date.now();
    if (live) {
      const { error } = await supabase.from("dishes").upsert({
        id, name: stamped.name, course: stamped.course, description: stamped.description,
        plating: stamped.plating, recipe_ids: stamped.recipeIds, season: stamped.season,
        diet: stamped.diet, updated_by: user.name, updated_at: new Date().toISOString(),
      });
      if (dbFail(error)) return;
    }
    if (editingId) setDishes((ds) => ds.map((d) => (d.id === editingId ? { ...d, ...stamped } : d)));
    else setDishes((ds) => [{ ...stamped, id }, ...ds]);
    flash(live ? "Opgeslagen — zichtbaar voor het hele team" : "Opgeslagen (demo: alleen op dit apparaat)");
  };
  const saveBatch = async (data) => {
    const b = { ...data, id: "b" + Date.now(), by: user.name };
    if (live) {
      const { error } = await supabase.from("ferment_batches").upsert({
        id: b.id, product: b.product, type: b.type, start_date: b.startDate, days: b.days,
        salt_pct: b.saltPct, temp_c: b.tempC, amount: b.amount, ph: b.pH, notes: b.notes,
        done: b.done, by: b.by,
      });
      if (dbFail(error)) return;
    }
    setBatches((bs) => [b, ...bs]);
    flash("Batch geregistreerd");
  };
  const toggleBatchDone = async (id) => {
    const b = batches.find((x) => x.id === id);
    if (live && b) {
      const { error } = await supabase.from("ferment_batches").update({ done: !b.done }).eq("id", id);
      if (dbFail(error)) return;
    }
    setBatches((bs) => bs.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  };
  const deleteBatch = async (id) => {
    const b = batches.find((x) => x.id === id);
    if (!b) return;
    const ok = window.confirm('Batch "' + b.product + '" definitief verwijderen voor het hele team?');
    if (!ok) return;
    if (live) {
      const { error } = await supabase.from("ferment_batches").delete().eq("id", id);
      if (dbFail(error)) return;
    }
    setBatches((bs) => bs.filter((x) => x.id !== id));
    flash(live ? "Batch verwijderd voor het hele team" : "Batch verwijderd (demo: alleen dit apparaat)");
  };
  const toggleEndorse = async (id) => {
    const r = recipes.find((x) => x.id === id);
    const has = r && r.endorsements.includes(user.name);
    if (live) {
      const { error } = has
        ? await supabase.from("recipe_endorsements").delete().eq("recipe_id", id).eq("user_name", user.name)
        : await supabase.from("recipe_endorsements").insert({ recipe_id: id, user_name: user.name });
      if (dbFail(error)) return;
    }
    setRecipes((rs) => rs.map((x) => x.id === id ? { ...x, endorsements: has ? x.endorsements.filter((n) => n !== user.name) : [...x.endorsements, user.name] } : x));
  };
  const savePairing = async (name, pairs, note) => {
    const clean = { name: name.trim().toLowerCase(), pairs: pairs.map((x) => x.trim().toLowerCase()).filter(Boolean), note: (note || "").trim() };
    if (!clean.name || clean.pairs.length === 0) { flash("Vul een naam en minstens één partner in"); return; }
    if (live) {
      const { error } = await supabase.from("flavor_pairings").upsert({ name: clean.name, pairs: clean.pairs, note: clean.note, updated_by: user.name, updated_at: new Date().toISOString() });
      if (dbFail(error)) return;
    }
    setPairings((ps) => ps.some((p) => p.name === clean.name) ? ps.map((p) => (p.name === clean.name ? clean : p)) : [...ps, clean]);
    flash(live ? "Smaakcombinatie opgeslagen" : "Opgeslagen (demo: alleen dit apparaat)");
  };
  const resetPairing = async (name) => {
    const orig = PAIRINGS.find((p) => p.name === name);
    const ok = window.confirm(orig ? 'Aanpassingen aan "' + name + '" terugdraaien naar het origineel?' : '"' + name + '" verwijderen voor het hele team?');
    if (!ok) return;
    if (live) { const { error } = await supabase.from("flavor_pairings").delete().eq("name", name); if (dbFail(error)) return; }
    setPairings((ps) => (orig ? ps.map((p) => (p.name === name ? orig : p)) : ps.filter((p) => p.name !== name)));
    flash(orig ? "Origineel hersteld" : "Smaakcombinatie verwijderd");
  };
  const deleteDish = async (id) => {
    const d = dishes.find((x) => x.id === id);
    if (!d) return;
    const ok = window.confirm('"' + d.name + '" verwijderen voor het hele team?');
    if (!ok) return;
    const isSeedDish = seedDishes.some((sd) => sd.id === id);
    if (live) {
      let error = null;
      if (isSeedDish) ({ error } = await supabase.from("dish_hidden").upsert({ dish_id: id, by: user.name }));
      else ({ error } = await supabase.from("dishes").delete().eq("id", id));
      if (dbFail(error)) return;
      if (isSeedDish) await supabase.from("dishes").delete().eq("id", id); // eventuele bewerking mee opruimen
    }
    setDishes((ds) => ds.filter((x) => x.id !== id));
    goBack();
    flash(live ? "Gerecht verwijderd voor het hele team" : "Gerecht verwijderd (demo: alleen dit apparaat)");
  };
  const deleteRecipe = async (id) => {
    const r = recipes.find((x) => x.id === id);
    if (!r) return;
    const ok = window.confirm('"' + r.name + '" verwijderen voor het hele team?');
    if (!ok) return;
    if (live) {
      let error = null;
      if (r.custom) ({ error } = await supabase.from("recipes_custom").delete().eq("id", id));
      else ({ error } = await supabase.from("recipe_hidden").upsert({ recipe_id: id, by: user.name }));
      if (dbFail(error)) return;
      // opruimen: onderschrijvingen, kok's keuze en eventuele aanpassing
      await supabase.from("recipe_endorsements").delete().eq("recipe_id", id);
      await supabase.from("recipe_picks").delete().eq("recipe_id", id);
      await supabase.from("recipe_overrides").delete().eq("id", id);
    }
    setRecipes((rs) => rs.filter((x) => x.id !== id));
    goBack();
    flash(live ? "Recept verwijderd voor het hele team" : "Recept verwijderd (demo: alleen dit apparaat)");
  };
  const toggleChefsPick = async (id) => {
    const r = recipes.find((x) => x.id === id);
    const on = r && r.chefsPick;
    if (live) {
      const { error } = on
        ? await supabase.from("recipe_picks").delete().eq("recipe_id", id)
        : await supabase.from("recipe_picks").upsert({ recipe_id: id, by: user.name });
      if (dbFail(error)) return;
    }
    setRecipes((rs) => rs.map((x) => (x.id === id ? { ...x, chefsPick: !x.chefsPick } : x)));
  };

  if (!user) return <><BrandCSS /><Login onPick={setUser} live={live} /></>;
  const openRecipe = (id) => push({ screen: "recipeDetail", id });
  const fabAction = () => {
    if (section === "gerechten") push({ screen: "dishForm", editing: null });
    else if (section === "recepten") push({ screen: "recipeForm", editing: null });
    else if (section === "fermentatie") push({ screen: "batchForm", prefill: null });
  };
  const showFab = current.screen === "list" && canEdit && section !== "smaak";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.paper, color: "#33352c" }}>
      <BrandCSS />
      <Header user={user} onHome={goHome} onOpenSettings={() => push({ screen: "settings" })} onSignOut={() => { if (live) supabase.auth.signOut(); setUser(null); resetTo({ screen: "list" }); }} />

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 pb-28">
        {current.screen === "list" && (
          <>
            <SectionNav section={section} setSection={(s) => { setSection(s); setSearch(""); }} />
            {section === "gerechten" && <DishList dishes={dishes} search={search} setSearch={setSearch} onOpen={(id) => push({ screen: "dishDetail", id })} />}
            {section === "recepten" && <RecipeList recipes={recipes} search={search} setSearch={setSearch} onOpen={openRecipe} />}
            {section === "fermentatie" && <FermentList batches={batches} recipes={recipes} canEdit={canEdit} onToggleDone={toggleBatchDone} onDeleteBatch={deleteBatch} onOpenRecipe={openRecipe} />}
            {section === "smaak" && <FlavorList pairings={pairings} canEdit={canEdit} onSave={savePairing} onReset={resetPairing} onSearchRecipes={(n) => { setSection("recepten"); setSearch(n); }} />}
          </>
        )}
        {current.screen === "dishDetail" && <DishDetail dish={dishById(current.id)} recipeById={recipeById} canEdit={canEdit} onBack={goBack} onEdit={() => push({ screen: "dishForm", editing: current.id })} onOpenRecipe={openRecipe} onDelete={deleteDish} />}
        {current.screen === "recipeDetail" && (() => { const r = recipeById(current.id); return (
          <RecipeDetail recipe={r} user={user} canEdit={canEdit} usageCount={usageCount(current.id)}
            baseRecipe={r?.baseId ? recipeById(r.baseId) : null} variations={r?.isBase ? variationsOf(current.id) : []}
            onBack={goBack} onEdit={() => push({ screen: "recipeForm", editing: current.id })} onEndorse={toggleEndorse}
            onChefsPick={toggleChefsPick} onOpenRecipe={openRecipe} onDelete={deleteRecipe}
            onStartBatch={() => push({ screen: "batchForm", prefill: r })} />
        ); })()}
        {current.screen === "dishForm" && <DishForm dish={current.editing ? dishById(current.editing) : null} allRecipes={recipes} recipeById={recipeById} onCancel={goBack} onSave={(d) => { saveDish(d, current.editing); goBack(); }} />}
        {current.screen === "recipeForm" && <RecipeForm recipe={current.editing ? recipeById(current.editing) : null} onCancel={goBack} onSave={(d) => { saveRecipe(d, current.editing); goBack(); }} />}
        {current.screen === "batchForm" && <BatchForm prefill={current.prefill} fermentRecipes={recipes.filter((r) => r.ferment)} onCancel={goBack} onSave={(d) => { saveBatch(d); setSection("fermentatie"); goBack(); }} />}
        {current.screen === "settings" && <SettingsScreen onBack={goBack} installed={installed} canInstall={!!deferredPrompt} onInstall={doInstall} />}
      </main>

      {showFab && (
        <button onClick={fabAction} className="btnp ff fixed bottom-6 right-1/2 translate-x-1/2 sm:right-6 sm:translate-x-0 z-20 inline-flex items-center gap-2 rounded-full pl-4 pr-5 py-3 shadow-lg font-medium text-sm">
          <Plus size={19} /> {section === "gerechten" ? "Nieuw gerecht" : section === "recepten" ? "Nieuw recept" : "Nieuwe batch"}
        </button>
      )}
      {toast && <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full text-sm px-4 py-2 shadow-lg" style={{ background: T.ink, color: T.paper }}><Check size={16} /> {toast}</div>}
    </div>
  );
}

function Wordmark({ size = "small", onHome }) {
  if (size === "large") return (
    <div className="text-center">
      <div className="text-[11px] font-semibold tracking-widest uppercase acc mb-3">Wilde Wortels · Landgoed de Beug</div>
      <h1 className="serif ink text-4xl leading-tight">In het ritme<br />van het land</h1>
      <div className="flex items-center justify-center gap-3 mt-3 mute text-[11px] tracking-widest uppercase">
        <span className="h-px w-6" style={{ background: "#c7c8b6" }} /> Odijk · sinds 1554 <span className="h-px w-6" style={{ background: "#c7c8b6" }} />
      </div>
    </div>
  );
  const Tag = onHome ? "button" : "div";
  return (
    <Tag onClick={onHome} className={"flex items-center gap-2 min-w-0 text-left " + (onHome ? "ff rounded-lg" : "")} title={onHome ? "Naar startscherm" : undefined}>
      <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: T.green }}><Sprout size={15} style={{ color: T.paper }} /></span>
      <span className="serif ink text-base leading-none truncate">In het ritme van het land</span>
    </Tag>
  );
}

function Login({ onPick, live }) {
  const [chosen, setChosen] = useState(null);   // gekozen kok (live-modus)
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const pickCook = async (m) => {
    if (!live) { onPick({ ...m, canEdit: true }); return; }
    setChosen(m); setPw(""); setErr(null);
  };
  const submitPw = async () => {
    if (!chosen || !pw || busy) return;
    setBusy(true); setErr(null);
    const email = COOK_EMAILS[chosen.name];
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    setBusy(false);
    if (error) setErr("Inloggen lukte niet. Controleer het wachtwoord.");
    // bij succes zet de sessie-listener in App de gebruiker vanzelf
  };
  const pickGuest = async () => {
    if (!live) { onPick({ name: "Gast", role: "Gast", canEdit: false }); return; }
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.signInAnonymously();
    setBusy(false);
    if (error) setErr("Gasttoegang lukte niet. Probeer opnieuw.");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: T.paper, color: "#33352c" }}>
      <div className="w-full max-w-sm">
        <Wordmark size="large" />
        <p className="mute text-center text-sm mt-5 mb-8">Het receptenboek van de moestuinkeuken.</p>

        {!chosen && (
          <>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase acc mb-3"><Lock size={13} /> Kies je naam</div>
            <div className="space-y-2">
              {TEAM.map((m) => (
                <button key={m.name} onClick={() => pickCook(m)} className="card cardh ff w-full flex items-center gap-3 px-3 py-3 text-left">
                  <span className="w-9 h-9 shrink-0 rounded-full font-semibold flex items-center justify-center serif" style={{ background: "#e8ebe0", color: T.green }}>{m.name[0]}</span>
                  <span><span className="block font-medium ink">{m.name}</span><span className="block text-xs mute">{m.role}</span></span>
                </button>
              ))}
            </div>
            <button onClick={pickGuest} disabled={busy} className="ff w-full mt-3 flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm mute disabled:opacity-60" style={{ border: "1px dashed #cfccbe" }}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />} Verder als gast (alleen lezen)
            </button>
            {err && <p className="text-xs mt-3 text-center" style={{ color: "#a23b2c" }}>{err}</p>}
            <p className="text-xs mute mt-5 leading-relaxed">{live ? "Log in met je eigen wachtwoord. Gasten kijken mee maar kunnen niets wijzigen." : "Demo-modus: er is nog geen database gekoppeld, wijzigingen blijven alleen op dit apparaat."}</p>
          </>
        )}

        {chosen && (
          <>
            <div className="card p-4">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-9 h-9 shrink-0 rounded-full font-semibold flex items-center justify-center serif" style={{ background: "#e8ebe0", color: T.green }}>{chosen.name[0]}</span>
                <span><span className="block font-medium ink">{chosen.name}</span><span className="block text-xs mute">{chosen.role}</span></span>
              </div>
              <label className="block text-sm font-medium ink mb-1.5">Wachtwoord</label>
              <input type="password" autoFocus className="input px-3 py-2.5" value={pw}
                onChange={(e) => setPw(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submitPw(); }}
                placeholder="Je wachtwoord" />
              {err && <p className="text-xs mt-2" style={{ color: "#a23b2c" }}>{err}</p>}
              <button onClick={submitPw} disabled={busy || !pw} className="btnp ff w-full mt-3 inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium py-2.5 disabled:opacity-60">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Lock size={15} />} Inloggen
              </button>
            </div>
            <button onClick={() => { setChosen(null); setErr(null); }} className="ff w-full mt-3 text-sm mute hover:opacity-70">Terug naar namen</button>
          </>
        )}
      </div>
    </div>
  );
}

function Header({ user, onHome, onOpenSettings, onSignOut }) {
  return (
    <header className="sticky top-0 z-20 backdrop-blur" style={{ background: "rgba(242,240,232,0.9)", borderBottom: "1px solid " + T.line }}>
      <div className="w-full max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <Wordmark onHome={onHome} />
        <div className="flex items-center gap-3 shrink-0">
          {!user.canEdit && <span className="inline-flex items-center gap-1 text-xs mute"><Eye size={13} /> Gast</span>}
          <span className="w-7 h-7 rounded-full font-semibold text-xs flex items-center justify-center serif" style={{ background: "#e8ebe0", color: T.green }} title={user.name + " · " + user.role}>{user.name[0]}</span>
          <button onClick={onOpenSettings} className="mute hover:opacity-70 focus:outline-none" title="Instellingen"><Settings size={18} /></button>
          <button onClick={onSignOut} className="mute hover:opacity-70 focus:outline-none" title="Uitloggen"><LogOut size={18} /></button>
        </div>
      </div>
    </header>
  );
}

function SettingsScreen({ onBack, installed, canInstall, onInstall }) {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const iOS = /iphone|ipad|ipod/i.test(ua);
  return (
    <div>
      <BackBar onBack={onBack} />
      <h1 className="serif ink text-3xl leading-tight">Instellingen</h1>

      <SectionTitle>App installeren</SectionTitle>
      <div className="card p-4">
        {installed ? (
          <div className="flex items-center gap-2 text-sm ink"><Check size={16} className="acc" /> De app staat op je beginscherm — je opent 'm nu schermvullend.</div>
        ) : canInstall ? (
          <>
            <p className="text-sm mute mb-3">Zet <span className="ink font-medium">In het ritme van het land</span> op je beginscherm. De app opent dan schermvullend, zonder browserbalk, en start sneller.</p>
            <button onClick={onInstall} className="btnp ff inline-flex items-center gap-2 rounded-lg text-sm font-medium px-4 py-2.5"><Download size={16} /> Installeer als app</button>
          </>
        ) : iOS ? (
          <div className="text-sm mute space-y-2">
            <p className="ink font-medium flex items-center gap-1.5"><Share size={15} className="acc" /> Op iPhone of iPad (Safari)</p>
            <ol className="space-y-1 list-decimal list-inside">
              <li>Tik onderin op de <span className="ink">Deel</span>-knop.</li>
              <li>Kies <span className="ink">Zet op beginscherm</span>.</li>
              <li>Bevestig met <span className="ink">Voeg toe</span>.</li>
            </ol>
          </div>
        ) : (
          <div className="text-sm mute space-y-2">
            <p className="ink font-medium flex items-center gap-1.5"><Smartphone size={15} className="acc" /> Toevoegen aan beginscherm</p>
            <p>Open het browsermenu (de drie puntjes) en kies <span className="ink">App installeren</span> of <span className="ink">Toevoegen aan startscherm</span>. Zodra je browser dit ondersteunt, verschijnt hier vanzelf een groene installatieknop.</p>
          </div>
        )}
      </div>
      <p className="text-xs mute mt-2 flex items-start gap-1.5"><Info size={13} className="shrink-0 mt-0.5" /> Installeren werkt op jullie eigen webadres, nadat de app is gepubliceerd. In deze preview is de knop nog niet actief.</p>

      <SectionTitle>Over</SectionTitle>
      <div className="card p-4 text-sm mute space-y-1">
        <div className="serif ink text-lg leading-tight">In het ritme van het land</div>
        <div>Wilde Wortels · Landgoed de Beug · Odijk</div>
        <div>Digitaal receptenboek van de moestuinkeuken · versie 1.0</div>
      </div>
    </div>
  );
}

function SectionNav({ section, setSection }) {
  const items = [
    { id: "gerechten", label: "Gerechten", icon: <Utensils size={15} /> },
    { id: "recepten", label: "Recepten", icon: <Layers size={15} /> },
    { id: "fermentatie", label: "Fermenteren", icon: <FlaskConical size={15} /> },
    { id: "smaak", label: "Smaak", icon: <Blend size={15} /> },
  ];
  return (
    <div className="flex gap-1.5 overflow-x-auto pt-4 pb-1 -mx-1 px-1">
      {items.map((it) => (
        <button key={it.id} onClick={() => setSection(it.id)} className={"ff shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium " + (section === it.id ? "pillon" : "pill")}>
          {it.icon}{it.label}
        </button>
      ))}
    </div>
  );
}

function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="relative mt-4 mb-3">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 mute" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input pl-9 pr-3 py-2.5 placeholder:text-neutral-400" />
    </div>
  );
}

const COURSE_FILTERS = ["Alle", "Voorgerecht", "Tussengerecht", "Hoofdgerecht", "Dessert"];

function DishList({ dishes, search, setSearch, onOpen }) {
  const [courseF, setCourseF] = useState("Alle");
  const q = search.trim().toLowerCase();
  let shown = dishes.filter((d) => d.name.toLowerCase().includes(q) || d.course.toLowerCase().includes(q));
  if (courseF !== "Alle") shown = shown.filter((d) => d.course.toLowerCase().includes(courseF.toLowerCase()));
  return (
    <div>
      <SearchBar value={search} onChange={setSearch} placeholder="Zoek gerechten" />
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-2 -mx-1 px-1 text-xs">
        {COURSE_FILTERS.map((c) => (
          <button key={c} onClick={() => setCourseF(c)} className={"ff shrink-0 rounded-full px-2.5 py-1 font-medium " + (courseF === c ? "pillon" : "pill")}>{c}</button>
        ))}
      </div>
      <div className="text-right text-xs mute mb-2">{shown.length} {shown.length === 1 ? "gerecht" : "gerechten"}</div>
      <div className="space-y-2.5">
        {shown.map((d) => (
          <button key={d.id} onClick={() => onOpen(d.id)} className="card cardh ff w-full text-left p-4 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-widest acc mb-1">{d.course}</div>
              <div className="serif ink text-xl leading-tight">{d.name}</div>
              <div className="text-sm mute mt-1 line-clamp-2">{d.description}</div>
              <div className="mt-2.5 flex items-center gap-2 flex-wrap text-xs mute">
                <span className="inline-flex items-center gap-1"><Layers size={13} className="acc" /> {d.recipeIds.length} recepten</span>
                {d.season && d.season.map((s) => <SeasonPill key={s} s={s} />)}
                {d.diet && d.diet !== "Vegetarisch" && <MeatPill diet={d.diet} />}
              </div>
            </div>
            <ChevronRight size={18} className="mt-1 shrink-0" style={{ color: "#c4c2b2" }} />
          </button>
        ))}
        {shown.length === 0 && <Empty label="Geen gerechten gevonden." />}
      </div>
    </div>
  );
}

function RecipeList({ recipes, search, setSearch, onOpen }) {
  const [sortMode, setSortMode] = useState("recommended");
  const [seasonF, setSeasonF] = useState("Alle");
  const [limit, setLimit] = useState(60);
  const q = search.trim().toLowerCase();
  let shown = recipes.filter((r) => r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q));
  if (seasonF !== "Alle") shown = shown.filter((r) => r.season.includes(seasonF) || r.season.includes("Hele jaar"));
  const sorted = [...shown].sort((a, b) => {
    if (sortMode === "az") return a.name.localeCompare(b.name);
    if (a.isBase !== b.isBase) return a.isBase ? -1 : 1;
    if (a.chefsPick !== b.chefsPick) return a.chefsPick ? -1 : 1;
    if (b.endorsements.length !== a.endorsements.length) return b.endorsements.length - a.endorsements.length;
    return a.name.localeCompare(b.name);
  });
  const visible = sorted.slice(0, limit);
  return (
    <div>
      <SearchBar value={search} onChange={(v) => { setSearch(v); setLimit(60); }} placeholder="Zoek recept of basis (bv. puree, biet)" />
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-2 -mx-1 px-1 text-xs">
        {["Alle", ...SEASONS].map((s) => (
          <button key={s} onClick={() => { setSeasonF(s); setLimit(60); }} className={"ff shrink-0 rounded-full px-2.5 py-1 font-medium " + (seasonF === s ? "pillon" : "pill")}>{s}</button>
        ))}
      </div>
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="mute">Sorteer</span>
          <button onClick={() => setSortMode("recommended")} className={"ff rounded-full px-2.5 py-1 font-medium " + (sortMode === "recommended" ? "pillon" : "pill")}>Aanbevolen</button>
          <button onClick={() => setSortMode("az")} className={"ff rounded-full px-2.5 py-1 font-medium " + (sortMode === "az" ? "pillon" : "pill")}>A–Z</button>
        </div>
        <span className="mute">{sorted.length} recepten</span>
      </div>
      <div className="space-y-2.5">
        {visible.map((r) => (
          <button key={r.id} onClick={() => onOpen(r.id)} className="card cardh ff w-full text-left p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="serif ink text-lg leading-tight truncate">{r.name}</span>
                {r.isBase && <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold rounded px-1.5 py-0.5" style={{ background: "#e8ebe0", color: T.green }}><GitBranch size={10} /> basis</span>}
                {r.ferment && <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold rounded px-1.5 py-0.5" style={{ background: "#e6e9df", color: "#46603f" }}><FlaskConical size={10} /> ferment</span>}
              </div>
              <div className="text-sm mute mt-0.5 truncate">{r.category} · {r.yield}</div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[11px]">
                {r.garden && <span className="inline-flex items-center gap-1 acc"><Sprout size={12} /> tuin</span>}
                {r.season.filter((s) => s !== "Hele jaar").map((s) => <SeasonPill key={s} s={s} />)}
                {r.chefsPick && <span className="inline-flex items-center gap-1 font-semibold acc"><Star size={12} fill="currentColor" /> Kok's keuze</span>}
                {r.endorsements.length > 0 && <span className="inline-flex items-center gap-1 mute"><ThumbsUp size={12} /> {r.endorsements.length}</span>}
                {r.diet !== "Vegetarisch" && <MeatPill diet={r.diet} />}
              </div>
            </div>
            <ChevronRight size={18} className="shrink-0" style={{ color: "#c4c2b2" }} />
          </button>
        ))}
        {sorted.length > limit && <button onClick={() => setLimit((l) => l + 100)} className="ff w-full rounded-xl text-sm mute py-3" style={{ border: "1px dashed #cfccbe" }}>Toon meer ({sorted.length - limit} resterend)</button>}
        {sorted.length === 0 && <Empty label="Niets gevonden voor dit seizoen of deze zoekterm." />}
      </div>
    </div>
  );
}

function SeasonPill({ s }) {
  const st = seasonStyle[s] || { background: "#eceadf", color: "#5b5e4f" };
  return <span className="inline-flex items-center rounded-full text-[10px] font-medium px-1.5 py-0.5" style={st}>{s}</span>;
}
function MeatPill({ diet }) { return <span className="inline-flex items-center rounded-full text-[10px] font-medium px-1.5 py-0.5" style={{ background: "#ecdcd6", color: "#8a4a3a" }}>{diet}</span>; }

const FERMENT_METHODS = ["Melkzuur", "Suikerfermentatie", "Azijnfermentatie"];

function FermentList({ batches, recipes, canEdit, onToggleDone, onDeleteBatch, onOpenRecipe }) {
  const [limit, setLimit] = useState(30);
  const [seasonF, setSeasonF] = useState("Alle");
  const [methodF, setMethodF] = useState("Alle");
  const active = batches.filter((b) => !b.done);
  const done = batches.filter((b) => b.done);
  let fermentRecipes = recipes.filter((r) => r.ferment);
  if (seasonF !== "Alle") fermentRecipes = fermentRecipes.filter((r) => r.season.includes(seasonF) || r.season.includes("Hele jaar"));
  if (methodF !== "Alle") fermentRecipes = fermentRecipes.filter((r) => r.fermentMethod === methodF);
  fermentRecipes = fermentRecipes.sort((a, b) => {
    if (a.isBase !== b.isBase) return a.isBase ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return (
    <div className="pt-4">
      <div className="card p-4 mb-4">
        <div className="flex items-center gap-2 serif ink text-lg"><FlaskConical size={17} className="acc" /> Fermentatie-batches</div>
        <p className="text-sm mute mt-1">Registreer batches met zout%, temperatuur, pH en duur. {canEdit ? "Tik op de + voor een nieuwe batch." : "Als gast kijk je mee."}</p>
      </div>
      {active.length > 0 && <Eyebrow>Actief</Eyebrow>}
      <div className="space-y-2.5">{active.map((b) => <BatchCard key={b.id} b={b} canEdit={canEdit} onToggleDone={onToggleDone} onDelete={onDeleteBatch} />)}</div>
      {done.length > 0 && <div className="mt-6"><Eyebrow>Afgerond</Eyebrow></div>}
      <div className="space-y-2.5">{done.map((b) => <BatchCard key={b.id} b={b} canEdit={canEdit} onToggleDone={onToggleDone} onDelete={onDeleteBatch} />)}</div>
      <div className="mt-6"><Eyebrow>Fermentatierecepten</Eyebrow></div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-2 -mx-1 px-1 text-xs">
        {["Alle", ...SEASONS].map((s) => (
          <button key={s} onClick={() => { setSeasonF(s); setLimit(30); }} className={"ff shrink-0 rounded-full px-2.5 py-1 font-medium " + (seasonF === s ? "pillon" : "pill")}>{s}</button>
        ))}
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-2 -mx-1 px-1 text-xs">
        {["Alle", ...FERMENT_METHODS].map((m) => (
          <button key={m} onClick={() => { setMethodF(m); setLimit(30); }} className={"ff shrink-0 rounded-full px-2.5 py-1 font-medium " + (methodF === m ? "pillon" : "pill")}>{m === "Alle" ? "Alle methodes" : m}</button>
        ))}
      </div>
      <div className="text-right text-xs mute mb-2">{fermentRecipes.length} recepten</div>
      <div className="space-y-2.5">
        {fermentRecipes.slice(0, limit).map((r) => (
          <button key={r.id} onClick={() => onOpenRecipe(r.id)} className="card cardh ff w-full text-left p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="serif ink text-lg leading-tight truncate">{r.name}</span>
                {r.isBase && <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold rounded px-1.5 py-0.5" style={{ background: "#e8ebe0", color: T.green }}><GitBranch size={10} /> basis</span>}
                <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold rounded px-1.5 py-0.5" style={{ background: "#e6e9df", color: "#46603f" }}><FlaskConical size={10} /> ferment</span>
              </div>
              <div className="text-sm mute mt-0.5 truncate">{r.category} · {r.yield}</div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[11px]">
                {r.garden && <span className="inline-flex items-center gap-1 acc"><Sprout size={12} /> tuin</span>}
                {r.season.filter((sx) => sx !== "Hele jaar").map((sx) => <SeasonPill key={sx} s={sx} />)}
                {r.chefsPick && <span className="inline-flex items-center gap-1 font-semibold acc"><Star size={12} fill="currentColor" /> Kok's keuze</span>}
                {r.endorsements.length > 0 && <span className="inline-flex items-center gap-1 mute"><ThumbsUp size={12} /> {r.endorsements.length}</span>}
              </div>
            </div>
            <ChevronRight size={18} className="shrink-0" style={{ color: "#c4c2b2" }} />
          </button>
        ))}
        {fermentRecipes.length > limit && <button onClick={() => setLimit((l) => l + 50)} className="ff w-full rounded-xl text-sm mute py-3" style={{ border: "1px dashed #cfccbe" }}>Toon meer ({fermentRecipes.length - limit} resterend)</button>}
      </div>
    </div>
  );
}

function BatchCard({ b, canEdit, onToggleDone, onDelete }) {
  const day = daysBetween(b.startDate);
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="serif ink text-lg leading-tight">{b.product}</div>
          <div className="text-xs mute mt-0.5">{b.type} · {b.amount} · door {b.by}</div>
        </div>
        {b.done ? <span className="shrink-0 text-[11px] font-semibold rounded-full px-2 py-0.5" style={{ background: "#e8ebe0", color: T.green }}>Afgerond</span>
          : <span className="shrink-0 text-[11px] font-semibold rounded-full px-2 py-0.5 pillon">Dag {day}/{b.days}</span>}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3 text-xs mute">
        <span className="inline-flex items-center gap-1.5"><Calendar size={13} /> Start {b.startDate}</span>
        <span className="inline-flex items-center gap-1.5"><Percent size={13} /> Zout {b.saltPct}%</span>
        <span className="inline-flex items-center gap-1.5"><Thermometer size={13} /> {b.tempC}°C</span>
        <span className="inline-flex items-center gap-1.5"><FlaskConical size={13} /> pH {b.pH ?? "—"}</span>
      </div>
      {b.notes && <p className="text-xs mute mt-2 italic">{b.notes}</p>}
      {canEdit && (
        <div className="flex items-center gap-4 mt-3">
          <button onClick={() => onToggleDone(b.id)} className="text-xs font-medium acc hover:opacity-70">{b.done ? "Heropen batch" : "Markeer als afgerond"}</button>
          <button onClick={() => onDelete(b.id)} className="inline-flex items-center gap-1 text-xs font-medium hover:opacity-70" style={{ color: "#8a4a3a" }}><Trash2 size={13} /> Verwijder batch</button>
        </div>
      )}
    </div>
  );
}

function FlavorList({ pairings, canEdit, onSave, onReset, onSearchRecipes }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const [editing, setEditing] = useState(null); // naam van item in bewerking, of "__new"
  const [fName, setFName] = useState("");
  const [fPairs, setFPairs] = useState("");
  const [fNote, setFNote] = useState("");
  const startEdit = (p) => { setEditing(p ? p.name : "__new"); setFName(p ? p.name : ""); setFPairs(p ? p.pairs.join(", ") : ""); setFNote(p ? p.note : ""); if (p) setOpen(p.name); };
  const submit = () => { onSave(fName, fPairs.split(","), fNote); setEditing(null); };
  const isSeed = (name) => PAIRINGS.some((p) => p.name === name);
  const shown = pairings.filter((p) => p.name.includes(q.toLowerCase()) || p.pairs.some((x) => x.includes(q.toLowerCase()))).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div>
      <div className="card p-4 mt-4 mb-3">
        <div className="flex items-center gap-2 serif ink text-lg"><Blend size={17} className="acc" /> Smaakcombinaties</div>
        <p className="text-sm mute mt-1">Inspiratie per product uit de moestuin. Tik op een product voor de partners.{canEdit && " Koks kunnen combinaties aanpassen en toevoegen."}</p>
        {canEdit && editing !== "__new" && (
          <button onClick={() => startEdit(null)} className="btno ff mt-3 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium px-3 py-2"><Plus size={15} /> Product toevoegen</button>
        )}
      </div>
      {editing === "__new" && (
        <PairingForm title="Nieuw product" name={fName} setName={setFName} nameLocked={false} pairs={fPairs} setPairs={setFPairs} note={fNote} setNote={setFNote} onSubmit={submit} onCancel={() => setEditing(null)} />
      )}
      <SearchBar value={q} onChange={setQ} placeholder="Zoek een product of smaak" />
      <div className="space-y-2">
        {shown.map((p) => (
          <div key={p.name} className="card overflow-hidden">
            <button onClick={() => setOpen(open === p.name ? null : p.name)} className="ff w-full flex items-center justify-between px-4 py-3 text-left">
              <span className="serif ink text-lg flex items-center gap-2">{cap(p.name)} {SEASON[p.name] && SEASON[p.name].filter((s) => s !== "Hele jaar").map((s) => <SeasonPill key={s} s={s} />)}</span>
              <ChevronRight size={16} className={"transition-transform " + (open === p.name ? "rotate-90" : "")} style={{ color: "#c4c2b2" }} />
            </button>
            {open === p.name && editing !== p.name && (
              <div className="px-4 pb-4 -mt-1">
                <p className="text-xs mute mb-2 italic">{p.note}</p>
                <div className="flex flex-wrap gap-1.5">{p.pairs.map((x) => <span key={x} className="chip rounded-full text-xs font-medium px-2.5 py-1">{x}</span>)}</div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button onClick={() => onSearchRecipes(p.name)} className="inline-flex items-center gap-1 text-xs font-medium acc hover:opacity-70"><Search size={12} /> Bekijk recepten met {p.name}</button>
                  {canEdit && <button onClick={() => startEdit(p)} className="inline-flex items-center gap-1 text-xs font-medium acc hover:opacity-70"><Pencil size={12} /> Bewerken</button>}
                </div>
              </div>
            )}
            {open === p.name && editing === p.name && (
              <div className="px-4 pb-4 -mt-1">
                <PairingForm title={"Bewerk " + p.name} name={fName} setName={setFName} nameLocked={true} pairs={fPairs} setPairs={setFPairs} note={fNote} setNote={setFNote} onSubmit={submit} onCancel={() => setEditing(null)}
                  extraLabel={isSeed(p.name) ? "Herstel origineel" : "Verwijderen"} onExtra={() => { setEditing(null); onReset(p.name); }} />
              </div>
            )}
          </div>
        ))}
        {shown.length === 0 && <Empty label="Geen combinatie gevonden." />}
      </div>
    </div>
  );
}

function PairingForm({ title, name, setName, nameLocked, pairs, setPairs, note, setNote, onSubmit, onCancel, extraLabel, onExtra }) {
  return (
    <div className="card p-4 mb-3">
      <div className="text-sm font-medium ink mb-3">{title}</div>
      {!nameLocked && <label className="block mb-3"><span className="block text-sm font-medium ink mb-1.5">Product</span><input className="input px-3 py-2.5" value={name} onChange={(e) => setName(e.target.value)} placeholder="bv. vlierbloesem" /></label>}
      <label className="block mb-3"><span className="block text-sm font-medium ink mb-1.5">Partners (gescheiden door komma's)</span><textarea rows={2} className="input px-3 py-2.5 resize-none" value={pairs} onChange={(e) => setPairs(e.target.value)} placeholder="bv. citroen, honing, room" /></label>
      <label className="block mb-3"><span className="block text-sm font-medium ink mb-1.5">Notitie</span><input className="input px-3 py-2.5" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Korte typering" /></label>
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={onSubmit} className="btnp ff inline-flex items-center gap-1.5 rounded-lg text-sm font-medium px-3.5 py-2"><Check size={15} /> Opslaan</button>
        <button onClick={onCancel} className="btno ff inline-flex items-center gap-1.5 rounded-lg text-sm font-medium px-3.5 py-2"><X size={15} /> Annuleren</button>
        {extraLabel && <button onClick={onExtra} className="ff inline-flex items-center gap-1.5 rounded-lg text-sm font-medium px-3.5 py-2" style={{ border: "1px solid #d9c4bd", color: "#8a4a3a", background: "#fff" }}><Trash2 size={15} /> {extraLabel}</button>}
      </div>
    </div>
  );
}

function BackBar({ onBack, onEdit }) {
  return (
    <div className="flex items-center justify-between pt-4 pb-2">
      <button onClick={onBack} className="ff inline-flex items-center gap-1 text-sm mute hover:opacity-70"><ArrowLeft size={16} /> Terug</button>
      {onEdit && <button onClick={onEdit} className="ff inline-flex items-center gap-1.5 text-sm font-medium acc hover:opacity-70"><Pencil size={15} /> Bewerken</button>}
    </div>
  );
}
function EditMeta({ by, at }) { return <div className="flex items-center gap-1.5 text-xs mute mt-2"><Clock size={12} /> Laatst bewerkt door <span className="ink font-medium">{by}</span> · {at}</div>; }
function Eyebrow({ children }) { return <h3 className="text-[11px] font-semibold uppercase tracking-widest acc mb-2">{children}</h3>; }

function DishDetail({ dish, recipeById, canEdit, onBack, onEdit, onOpenRecipe, onDelete }) {
  if (!dish) return null;
  return (
    <div>
      <BackBar onBack={onBack} onEdit={canEdit ? onEdit : null} />
      <div className="text-[11px] font-semibold uppercase tracking-widest acc mb-1">{dish.course}</div>
      <h1 className="serif ink text-3xl leading-tight">{dish.name}</h1>
      <div className="flex flex-wrap gap-2 mt-2.5">{dish.season && dish.season.map((s) => <SeasonPill key={s} s={s} />)}{dish.diet && dish.diet !== "Vegetarisch" && <MeatPill diet={dish.diet} />}</div>
      <p className="mute mt-2 leading-relaxed">{dish.description}</p>
      {canEdit && (
        <button onClick={() => onDelete(dish.id)} className="ff mt-4 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium px-3 py-2" style={{ border: "1px solid #d9c4bd", color: "#8a4a3a", background: "#fff" }}><Trash2 size={15} /> Verwijderen</button>
      )}
      <EditMeta by={dish.updatedBy} at={dish.updatedAt} />
      <SectionTitle>Onderdelen</SectionTitle>
      <div className="space-y-2">
        {dish.recipeIds.map((id) => { const r = recipeById(id); if (!r) return null; return (
          <button key={id} onClick={() => onOpenRecipe(id)} className="card cardh ff w-full text-left p-3.5 flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#e8ebe0", color: T.green }}><Layers size={15} /></span>
            <div className="flex-1 min-w-0"><div className="font-medium ink truncate">{r.name}</div><div className="text-xs mute">{r.category}</div></div>
            {r.chefsPick && <Star size={14} className="acc shrink-0" fill="currentColor" />}
            <ChevronRight size={16} style={{ color: "#c4c2b2" }} />
          </button>
        ); })}
      </div>
      {dish.plating && <><SectionTitle>Dressering</SectionTitle><p className="card p-4 mute leading-relaxed">{dish.plating}</p></>}
    </div>
  );
}

function RecipeDetail({ recipe, user, canEdit, usageCount, baseRecipe, variations, onBack, onEdit, onEndorse, onChefsPick, onOpenRecipe, onStartBatch, onDelete }) {
  const [factor, setFactor] = useState(1);
  if (!recipe) return null;
  const endorsed = recipe.endorsements.includes(user.name);
  const factors = [0.5, 1, 2, 3];
  return (
    <div>
      <BackBar onBack={onBack} onEdit={canEdit ? onEdit : null} />
      <h1 className="serif ink text-3xl leading-tight">{recipe.name}</h1>
      <div className="flex flex-wrap gap-2 mt-3">
        <Chip>{recipe.category}</Chip>
        {recipe.fermentMethod && <Chip>{recipe.fermentMethod}</Chip>}
        {recipe.gear && <Chip>{recipe.gear}</Chip>}
        {recipe.garden && <span className="inline-flex items-center gap-1 rounded-full text-xs font-medium px-2.5 py-1" style={{ background: "#e4ecdc", color: "#3f5a34" }}><Sprout size={12} /> eigen tuin</span>}
        {recipe.season.filter((s) => s !== "Hele jaar").map((s) => <SeasonPill key={s} s={s} />)}
        {recipe.diet !== "Vegetarisch" && <MeatPill diet={recipe.diet} />}
        {recipe.isBase && <span className="inline-flex items-center gap-1 rounded-full text-xs font-semibold px-2.5 py-1" style={{ background: "#e8ebe0", color: T.green }}><GitBranch size={12} /> basisrecept</span>}
      </div>

      {baseRecipe && <button onClick={() => onOpenRecipe(baseRecipe.id)} className="ff mt-3 inline-flex items-center gap-1.5 text-sm acc hover:opacity-70"><GitBranch size={14} /> Variatie op {recipe.baseName} — bekijk de basis</button>}

      {canEdit && (
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button onClick={() => onEndorse(recipe.id)} className={"ff inline-flex items-center gap-1.5 rounded-lg text-sm font-medium px-3 py-2 " + (endorsed ? "btnp" : "btno")}><ThumbsUp size={15} /> {endorsed ? "Onderschreven" : "Onderschrijf"} · {recipe.endorsements.length}</button>
          <button onClick={() => onChefsPick(recipe.id)} className="ff btno inline-flex items-center gap-1.5 rounded-lg text-sm font-medium px-3 py-2" style={recipe.chefsPick ? { background: "#eef1e7", borderColor: "#3a4b30" } : undefined}><Star size={15} className={recipe.chefsPick ? "acc" : ""} fill={recipe.chefsPick ? "currentColor" : "none"} /> Kok's keuze</button>
          {recipe.ferment && <button onClick={onStartBatch} className="ff btno inline-flex items-center gap-1.5 rounded-lg text-sm font-medium px-3 py-2"><FlaskConical size={15} /> Registreer batch</button>}
          <button onClick={() => onDelete(recipe.id)} className="ff inline-flex items-center gap-1.5 rounded-lg text-sm font-medium px-3 py-2" style={{ border: "1px solid #d9c4bd", color: "#8a4a3a", background: "#fff" }}><Trash2 size={15} /> Verwijderen</button>
        </div>
      )}
      <div className="text-xs mute mt-2.5">Gebruikt in {usageCount} {usageCount === 1 ? "gerecht" : "gerechten"}{recipe.endorsements.length > 0 && <> · Onderschreven door {recipe.endorsements.join(", ")}</>}</div>
      <EditMeta by={recipe.updatedBy} at={recipe.updatedAt} />

      <div className="flex items-center gap-2 mt-6 mb-1 flex-wrap">
        <span className="text-[11px] font-semibold uppercase tracking-widest acc">Hoeveelheid</span>
        <div className="flex items-center gap-1">
          {factors.map((f) => <button key={f} onClick={() => setFactor(f)} className={"ff rounded-md px-2.5 py-1 text-xs font-semibold " + (factor === f ? "pillon" : "pill")}>×{String(f).replace(".", ",")}</button>)}
        </div>
        {factor !== 1 && <span className="text-xs mute">Opbrengst: {scaleAmount(recipe.yield, factor)}</span>}
      </div>
      <div className="card overflow-hidden">
        {recipe.ingredients.map((ing, i) => (
          <div key={i} className={"flex items-center justify-between px-4 py-2.5 text-sm " + (i > 0 ? "divi" : "")}><span style={{ color: "#3b3d33" }}>{ing.item}</span><span className={"font-medium " + (factor !== 1 ? "acc" : "mute")}>{scaleAmount(ing.amount, factor)}</span></div>
        ))}
      </div>

      {recipe.fermentDefaults && (
        <div className="mt-4 tintbox rounded-xl p-4 text-sm" style={{ color: "#3f5238" }}>
          <div className="font-semibold flex items-center gap-1.5 mb-1"><FlaskConical size={14} /> Fermentatie-richtlijn</div>
          Zout {recipe.fermentDefaults.saltPct}% · ±{recipe.fermentDefaults.tempC}°C · ±{recipe.fermentDefaults.days} dagen. Meet de pH en proef onderweg.
        </div>
      )}

      <SectionTitle>Bereiding</SectionTitle>
      <ol className="space-y-2.5">
        {recipe.steps.map((s, i) => (<li key={i} className="flex gap-3"><span className="w-6 h-6 shrink-0 rounded-full text-xs font-semibold flex items-center justify-center mt-0.5" style={{ background: T.green, color: T.paper }}>{i + 1}</span><span className="leading-relaxed" style={{ color: "#3b3d33" }}>{s}</span></li>))}
      </ol>

      {recipe.isBase && variations.length > 0 && (
        <><SectionTitle>Variaties ({variations.length})</SectionTitle>
        <div className="flex flex-wrap gap-2">{variations.map((v) => <button key={v.id} onClick={() => onOpenRecipe(v.id)} className="btno ff rounded-full text-sm px-3 py-1.5">{v.name}</button>)}</div></>
      )}
    </div>
  );
}

function SectionTitle({ children }) { return <h2 className="text-[11px] font-semibold uppercase tracking-widest acc mt-7 mb-2.5">{children}</h2>; }
function Chip({ children }) { return <span className="chip inline-flex items-center rounded-full text-xs font-medium px-2.5 py-1">{children}</span>; }
function Empty({ label }) { return <div className="text-center text-sm mute card py-10 px-4" style={{ borderStyle: "dashed" }}>{label}</div>; }
function Field({ label, children }) { return <label className="block mb-4"><span className="block text-sm font-medium ink mb-1.5">{label}</span>{children}</label>; }

function FormBar({ title, onCancel, onSave, saveLabel = "Opslaan" }) {
  return (
    <div className="flex items-center justify-between pt-4 pb-4">
      <button onClick={onCancel} className="ff inline-flex items-center gap-1 text-sm mute hover:opacity-70"><X size={16} /> Annuleren</button>
      <span className="serif ink text-lg">{title}</span>
      <button onClick={onSave} className="btnp ff inline-flex items-center gap-1.5 rounded-lg text-sm font-medium px-3.5 py-2"><Check size={16} /> {saveLabel}</button>
    </div>
  );
}

function RecipeForm({ recipe, onCancel, onSave }) {
  const [name, setName] = useState(recipe?.name || "");
  const [category, setCategory] = useState(recipe?.category || "");
  const [yieldVal, setYieldVal] = useState(recipe?.yield || "");
  const [ingredients, setIngredients] = useState(recipe?.ingredients?.length ? recipe.ingredients : [{ item: "", amount: "" }]);
  const [steps, setSteps] = useState(recipe?.steps?.length ? recipe.steps : [""]);
  const [seasons, setSeasons] = useState((recipe?.season || []).filter((s) => s !== "Hele jaar"));
  const [diet, setDiet] = useState(recipe?.diet || "Vegetarisch");
  const [ferment, setFerment] = useState(!!recipe?.ferment);
  const [fermentMethod, setFermentMethod] = useState(recipe?.fermentMethod || "Melkzuur");
  const fd = recipe?.fermentDefaults;
  const [fSalt, setFSalt] = useState(fd ? String(fd.saltPct) : "2.5");
  const [fTemp, setFTemp] = useState(fd ? String(fd.tempC) : "20");
  const [fDays, setFDays] = useState(fd ? String(fd.days) : "10");
  const [translating, setTranslating] = useState(false);
  const [err, setErr] = useState(null);
  const setIng = (i, k, v) => setIngredients((a) => a.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)));
  const setStep = (i, v) => setSteps((a) => a.map((x, idx) => (idx === i ? v : x)));
  const toggleSeason = (s) => setSeasons((a) => (a.includes(s) ? a.filter((x) => x !== s) : [...a, s]));
  async function handleTranslate() {
    setTranslating(true); setErr(null);
    try {
      const prompt = "Je bent een professionele Nederlandse keukenvertaler. Vertaal de tekstvelden naar het Nederlands, laat al-Nederlandse velden ongewijzigd, en houd hoeveelheden/eenheden exact gelijk. Geef UITSLUITEND geldige JSON terug, zonder markdown, in deze vorm:\n{\"name\":\"...\",\"category\":\"...\",\"yield\":\"...\",\"ingredients\":[{\"item\":\"...\",\"amount\":\"...\"}],\"steps\":[\"...\"]}\n\nRecept:\n" + JSON.stringify({ name, category, yield: yieldVal, ingredients, steps });
      const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }) });
      const data = await res.json();
      const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("").trim();
      const p = JSON.parse(text.replace(/```json/gi, "").replace(/```/g, "").trim());
      if (p.name) setName(p.name); if (p.category) setCategory(p.category); if (p.yield) setYieldVal(p.yield);
      if (Array.isArray(p.ingredients) && p.ingredients.length) setIngredients(p.ingredients);
      if (Array.isArray(p.steps) && p.steps.length) setSteps(p.steps);
    } catch (e) { setErr("Vertalen lukte niet. Probeer opnieuw."); } finally { setTranslating(false); }
  }
  const submit = () => { if (!name.trim()) return; onSave({
    name: name.trim(), category: category.trim() || "Zonder categorie", yield: yieldVal.trim() || "—",
    ingredients: ingredients.filter((x) => x.item.trim()), steps: steps.filter((x) => x.trim()),
    season: seasons.length ? SEASONS.filter((s) => seasons.includes(s)) : ["Hele jaar"],
    diet,
    ferment,
    fermentMethod: ferment ? fermentMethod : null,
    fermentDefaults: ferment ? { saltPct: Number(String(fSalt).replace(",", ".")) || 0, tempC: Number(fTemp) || 20, days: Number(fDays) || 0 } : null,
  }); };
  return (
    <div>
      <FormBar title={recipe ? "Recept bewerken" : "Nieuw recept"} onCancel={onCancel} onSave={submit} />
      <button onClick={handleTranslate} disabled={translating} className="ff w-full mb-1.5 inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium py-2.5 disabled:opacity-60" style={{ background: "#eef1e7", border: "1px solid #d6ddc9", color: T.green }}>{translating ? (<><Loader2 size={15} className="animate-spin" /> Bezig met vertalen…</>) : (<><Languages size={15} /> Vertaal naar Nederlands</>)}</button>
      <p className="text-xs mute mb-4">Recept in een andere taal? Vertaal in één tik.</p>
      {err && <p className="text-xs mb-3" style={{ color: "#a23b2c" }}>{err}</p>}
      <Field label="Naam"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="bv. Gefermenteerde rode biet" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Categorie"><input className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Fermentatie" /></Field>
        <Field label="Opbrengst"><input className={inputCls} value={yieldVal} onChange={(e) => setYieldVal(e.target.value)} placeholder="1 pot" /></Field>
      </div>
      <div className="text-sm font-medium ink mb-1.5">Seizoen <span className="mute font-normal">(niets gekozen = hele jaar)</span></div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {SEASONS.map((s) => (
          <button key={s} type="button" onClick={() => toggleSeason(s)} className={"ff rounded-full px-3 py-1.5 text-xs font-medium " + (seasons.includes(s) ? "pillon" : "pill")}>{s}</button>
        ))}
      </div>
      <Field label="Dieet"><select className={inputCls} value={diet} onChange={(e) => setDiet(e.target.value)}>{["Vegetarisch","Varkensvlees","Rundvlees"].map((d) => <option key={d}>{d}</option>)}</select></Field>
      <div className="tintbox rounded-xl p-4 mb-4">
        <button type="button" onClick={() => setFerment((f) => !f)} className="ff w-full flex items-center gap-3 text-left">
          <span className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={ferment ? { background: T.green, color: T.paper } : { border: "1px solid #cfccbe", background: "#fff" }}>{ferment && <Check size={13} />}</span>
          <span className="text-sm font-medium ink inline-flex items-center gap-1.5"><FlaskConical size={15} className="acc" /> Dit is een fermentatierecept</span>
        </button>
        {ferment && (
          <div className="mt-3">
            <Field label="Fermentatiemethode"><select className={inputCls} value={fermentMethod} onChange={(e) => setFermentMethod(e.target.value)}>{FERMENT_METHODS.map((m) => <option key={m}>{m}</option>)}</select></Field>
            <div className="text-sm font-medium ink mb-1.5">Batchrichtlijn <span className="mute font-normal">(voorgevuld bij een nieuwe batch)</span></div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Zout (%)"><input type="number" step="0.1" className={inputCls} value={fSalt} onChange={(e) => setFSalt(e.target.value)} /></Field>
              <Field label="Temp (°C)"><input type="number" className={inputCls} value={fTemp} onChange={(e) => setFTemp(e.target.value)} /></Field>
              <Field label="Dagen"><input type="number" className={inputCls} value={fDays} onChange={(e) => setFDays(e.target.value)} /></Field>
            </div>
            <p className="text-xs mute -mt-2">Verschijnt met de methode als filter op de fermentatiepagina, en is daar direct als batch te starten.</p>
          </div>
        )}
      </div>
      <div className="text-sm font-medium ink mb-1.5">Ingrediënten</div>
      <div className="space-y-2 mb-2">{ingredients.map((ing, i) => (
        <div key={i} className="flex gap-2">
          <input className={inputCls + " flex-1 min-w-0"} style={{ width: "auto" }} value={ing.item} onChange={(e) => setIng(i, "item", e.target.value)} placeholder="Ingrediënt" />
          <input className={inputCls} style={{ width: "7rem", flex: "0 0 7rem" }} value={ing.amount} onChange={(e) => setIng(i, "amount", e.target.value)} placeholder="Hoeveelheid" />
          <button onClick={() => setIngredients((a) => a.filter((_, idx) => idx !== i))} className="mute hover:opacity-60 px-1"><Trash2 size={16} /></button>
        </div>))}
      </div>
      <AddRow onClick={() => setIngredients((a) => [...a, { item: "", amount: "" }])} label="Ingrediënt toevoegen" />
      <div className="text-sm font-medium ink mb-1.5 mt-5">Bereiding</div>
      <div className="space-y-2 mb-2">{steps.map((s, i) => (
        <div key={i} className="flex gap-2 items-start">
          <span className="w-6 h-6 shrink-0 rounded-full text-xs font-semibold flex items-center justify-center mt-2" style={{ background: "#e8ebe0", color: T.green }}>{i + 1}</span>
          <textarea rows={2} className={inputCls + " flex-1 resize-none"} value={s} onChange={(e) => setStep(i, e.target.value)} placeholder="Beschrijf de stap" />
          <button onClick={() => setSteps((a) => a.filter((_, idx) => idx !== i))} className="mute hover:opacity-60 px-1 mt-2"><Trash2 size={16} /></button>
        </div>))}
      </div>
      <AddRow onClick={() => setSteps((a) => [...a, ""])} label="Stap toevoegen" />
    </div>
  );
}

function DishForm({ dish, allRecipes, recipeById, onCancel, onSave }) {
  const [name, setName] = useState(dish?.name || "");
  const [course, setCourse] = useState(dish?.course || "");
  const [description, setDescription] = useState(dish?.description || "");
  const [plating, setPlating] = useState(dish?.plating || "");
  const [recipeIds, setRecipeIds] = useState(dish?.recipeIds || []);
  const [seasons, setSeasons] = useState((dish?.season || []).filter((s) => s !== "Hele jaar"));
  const [diet, setDiet] = useState(dish?.diet || "Vegetarisch");
  const [pick, setPick] = useState("");
  const toggle = (id) => setRecipeIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const toggleSeason = (s) => setSeasons((a) => (a.includes(s) ? a.filter((x) => x !== s) : [...a, s]));
  const suggestCourse = (g) => setCourse(seasons.length === 1 ? seasons[0] + g.toLowerCase() : g);
  const matches = (pick.trim() ? allRecipes.filter((r) => r.name.toLowerCase().includes(pick.toLowerCase())) : allRecipes).slice(0, 40);
  const submit = () => { if (!name.trim()) return; onSave({ name: name.trim(), course: course.trim() || "Gerecht", description: description.trim(), plating: plating.trim(), recipeIds, season: SEASONS.filter((s) => seasons.includes(s)), diet }); };
  return (
    <div>
      <FormBar title={dish ? "Gerecht bewerken" : "Nieuw gerecht"} onCancel={onCancel} onSave={submit} />
      <Field label="Naam"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="bv. Drie bieten uit eigen tuin" /></Field>
      <div className="text-sm font-medium ink mb-1.5">Seizoen <span className="mute font-normal">(voor het seizoensfilter)</span></div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {SEASONS.map((s) => (
          <button key={s} type="button" onClick={() => toggleSeason(s)} className={"ff rounded-full px-3 py-1.5 text-xs font-medium " + (seasons.includes(s) ? "pillon" : "pill")}>{s}</button>
        ))}
      </div>
      <Field label="Gang"><input className={inputCls} value={course} onChange={(e) => setCourse(e.target.value)} placeholder="Herfstvoorgerecht" /></Field>
      <div className="flex flex-wrap gap-1.5 -mt-2 mb-4">
        {["Voorgerecht","Tussengerecht","Hoofdgerecht","Dessert"].map((g) => (
          <button key={g} type="button" onClick={() => suggestCourse(g)} className="ff pill rounded-full px-2.5 py-1 text-xs font-medium">{g}</button>
        ))}
      </div>
      <Field label="Dieet"><select className={inputCls} value={diet} onChange={(e) => setDiet(e.target.value)}>{["Vegetarisch","Varkensvlees","Rundvlees"].map((d) => <option key={d}>{d}</option>)}</select></Field>
      <Field label="Omschrijving"><textarea rows={2} className={inputCls + " resize-none"} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Korte regel over het gerecht" /></Field>
      <div className="text-sm font-medium ink mb-1.5 mt-1">Recepten in dit gerecht <span className="mute font-normal">({recipeIds.length})</span></div>
      {recipeIds.length > 0 && <div className="flex flex-wrap gap-1.5 mb-2">{recipeIds.map((id, i) => { const r = recipeById(id); if (!r) return null; return <span key={id} className="inline-flex items-center gap-1 rounded-full text-xs font-medium px-2 py-1" style={{ background: "#e8ebe0", color: T.green }}>#{i + 1} {r.name}<button onClick={() => toggle(id)}><X size={12} /></button></span>; })}</div>}
      <div className="relative mb-2"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 mute" /><input value={pick} onChange={(e) => setPick(e.target.value)} placeholder="Zoek een recept om toe te voegen" className={inputCls + " pl-9"} /></div>
      <div className="card overflow-auto mb-5 max-h-72">
        {matches.map((r, i) => { const on = recipeIds.includes(r.id); return (
          <button key={r.id} onClick={() => toggle(r.id)} className={"ff w-full flex items-center gap-3 px-4 py-3 text-left " + (i > 0 ? "divi" : "")}>
            <span className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={on ? { background: T.green, color: T.paper } : { border: "1px solid #cfccbe" }}>{on && <Check size={13} />}</span>
            <div className="flex-1 min-w-0"><div className="text-sm font-medium ink truncate">{r.name}</div><div className="text-xs mute">{r.category}</div></div>
          </button>); })}
      </div>
      <Field label="Dressering"><textarea rows={3} className={inputCls + " resize-none"} value={plating} onChange={(e) => setPlating(e.target.value)} placeholder="Hoe het op het bord komt" /></Field>
    </div>
  );
}

function BatchForm({ prefill, fermentRecipes, onCancel, onSave }) {
  const fd = prefill?.fermentDefaults;
  const [product, setProduct] = useState(prefill ? prefill.name : "");
  const [type, setType] = useState(prefill?.fermentMethod || "Melkzuur");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [days, setDays] = useState(fd ? String(fd.days) : "10");
  const [saltPct, setSaltPct] = useState(fd ? String(fd.saltPct) : "2.5");
  const [tempC, setTempC] = useState(fd ? String(fd.tempC) : "20");
  const [amount, setAmount] = useState("");
  const [pH, setPH] = useState("");
  const [notes, setNotes] = useState("");
  const [pick, setPick] = useState("");
  const applyRecipe = (r) => {
    setProduct(r.name);
    if (r.fermentMethod) setType(r.fermentMethod);
    if (r.fermentDefaults) { setSaltPct(String(r.fermentDefaults.saltPct)); setTempC(String(r.fermentDefaults.tempC)); setDays(String(r.fermentDefaults.days)); }
    setPick("");
  };
  const pickMatches = pick.trim() ? (fermentRecipes || []).filter((r) => r.name.toLowerCase().includes(pick.trim().toLowerCase())).slice(0, 8) : [];
  const submit = () => { if (!product.trim()) return; onSave({ product: product.trim(), type, startDate, days: Number(days) || 0, saltPct: Number(saltPct) || 0, tempC: Number(tempC) || 0, amount: amount.trim() || "—", pH: pH ? Number(pH) : null, notes: notes.trim(), done: false }); };
  return (
    <div>
      <FormBar title="Nieuwe batch" onCancel={onCancel} onSave={submit} saveLabel="Registreer" />
      <div className="text-sm font-medium ink mb-1.5">Kies een fermentatierecept <span className="mute font-normal">(vult naam, methode en richtlijn in)</span></div>
      <div className="relative mb-2"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 mute" /><input value={pick} onChange={(e) => setPick(e.target.value)} placeholder="Zoek een fermentatierecept" className={inputCls + " pl-9"} /></div>
      {pickMatches.length > 0 && (
        <div className="card overflow-hidden mb-4">
          {pickMatches.map((r, i) => (
            <button key={r.id} onClick={() => applyRecipe(r)} className={"ff w-full flex items-center gap-3 px-4 py-3 text-left " + (i > 0 ? "divi" : "")}>
              <FlaskConical size={15} className="acc shrink-0" />
              <div className="flex-1 min-w-0"><div className="text-sm font-medium ink truncate">{r.name}</div><div className="text-xs mute">{r.fermentMethod || r.category}{r.fermentDefaults ? " · " + r.fermentDefaults.saltPct + "% · " + r.fermentDefaults.days + " dgn" : ""}</div></div>
            </button>
          ))}
        </div>
      )}
      <Field label="Product / recept"><input className={inputCls} value={product} onChange={(e) => setProduct(e.target.value)} placeholder="bv. Zuurkool van rode kool" /></Field>
      <Field label="Type"><select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>{["Melkzuur","Zuurkool","Kimchi","Hotsauce","Kappertjes","Suikerfermentatie","Kombucha","Waterkefir","Gemberbier","Wilde drank","Landwijn / cider","Azijnfermentatie","Zuivel","Zoutpruimen","Anders"].map((t) => <option key={t}>{t}</option>)}</select></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Startdatum"><input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
        <Field label="Duur (dagen)"><input type="number" className={inputCls} value={days} onChange={(e) => setDays(e.target.value)} /></Field>
        <Field label="Zoutgehalte (%)"><input type="number" step="0.1" className={inputCls} value={saltPct} onChange={(e) => setSaltPct(e.target.value)} /></Field>
        <Field label="Temperatuur (°C)"><input type="number" className={inputCls} value={tempC} onChange={(e) => setTempC(e.target.value)} /></Field>
        <Field label="Hoeveelheid"><input className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="bv. 3 kg" /></Field>
        <Field label="pH (optioneel)"><input type="number" step="0.1" className={inputCls} value={pH} onChange={(e) => setPH(e.target.value)} placeholder="bv. 3,6" /></Field>
      </div>
      <Field label="Notities"><textarea rows={2} className={inputCls + " resize-none"} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Waarnemingen, proefnotities…" /></Field>
    </div>
  );
}

function AddRow({ onClick, label }) { return <button onClick={onClick} className="ff inline-flex items-center gap-1.5 text-sm font-medium acc hover:opacity-70"><Plus size={15} /> {label}</button>; }
