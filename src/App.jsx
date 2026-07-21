import { useState, useEffect } from "react";
import {
  ChefHat, Utensils, Layers, Plus, Search, ChevronRight, ArrowLeft, Pencil, X, Check,
  Settings, Download, Share, Smartphone, Info,
  Clock, LogOut, Trash2, Lock, Languages, Loader2, ThumbsUp, Star, GitBranch, Sprout,
  FlaskConical, Blend, Eye, Calendar, Thermometer, Percent
} from "lucide-react";

/* In het ritme van het land — receptenboek van Wilde Wortels, Landgoed de Beug (Odijk).
   Biologisch, seizoensgebonden, uit eigen moestuin.
   Basistechnieken die uitwaaieren in variaties per (tuin)ingrediënt, met
   seizoenslabels, fermentatie-batchregistratie, smaakcombinaties, een reken-
   tool per recept en een gastmodus (alleen lezen). Alles origineel. */

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
  "snijbiet ":["Zomer"],
};
const seasonOf = (m) => SEASON[m] || ["Hele jaar"];

const BASES = [
  // ---- oude basistechnieken (voorraad + tuin overlap) ----
  { id:"mousse", baseName:"Vruchtenmousse", noun:"Mousse", generic:"fruit", category:"Mousses", yield:"≈ 650 g", chefsPick:true, endorsements:["Michael","Stef"], gear:"Thermoblender", mains:[...FRUIT.slice(0,24),"tomaat"],
    ingredients:[{item:"Püree van {x}",amount:"250 g"},{item:"Slagroom",amount:"200 g"},{item:"Suiker",amount:"40 g"},{item:"Gelatineblaadjes",amount:"3 blaadjes"},{item:"Citroensap",amount:"10 g"}],
    steps:["Week de gelatine.","Verwarm een derde van de püree van {x} en los de gelatine op.","Meng met de rest en het citroensap; koel tot lobbig.","Spatel de halfgeslagen room erdoor; 3 uur opstijven."] },
  { id:"gel", baseName:"Vruchtengel", noun:"Gel", generic:"fruit", category:"Gels & sauzen", yield:"≈ 400 g", chefsPick:true, gear:"Thermoblender", mains:FRUIT,
    ingredients:[{item:"Sap/püree van {x}",amount:"400 g"},{item:"Agar-agar",amount:"3 g"},{item:"Suiker",amount:"20 g"}],
    steps:["Kook sap van {x} met agar 2 min.","Laat opstijven en mix glad.","Passeer in een knijpfles."] },
  { id:"sorbet", baseName:"Fruitsorbet", noun:"Sorbet", generic:"fruit", category:"Sorbet & ijs", yield:"≈ 700 g", chefsPick:true, gear:"Sorbetmachine", mains:FRUIT_ONLY,
    ingredients:[{item:"Püree van {x}",amount:"500 g"},{item:"Suikersiroop",amount:"150 g"},{item:"Glucose",amount:"30 g"},{item:"Citroensap",amount:"15 g"}],
    steps:["Meng alles glad.","Rijp 4 uur koud.","Draai in de sorbetmachine; bewaar op -18°C."] },
  { id:"crumble", baseName:"Notencrumble", noun:"Crumble", generic:"noot", category:"Crumbles & garnituur", yield:"≈ 250 g", mains:NUT,
    ingredients:[{item:"{X}, gehakt",amount:"100 g"},{item:"Bloem",amount:"60 g"},{item:"Boter",amount:"60 g"},{item:"Suiker",amount:"40 g"}],
    steps:["Wrijf tot kruimels en meng de {x} erdoor.","Bak 12 min op 170°C.","Laat krokant afkoelen."] },
  { id:"ganache", baseName:"Ganache", generic:"chocolade", category:"Zoet & patisserie", yield:"≈ 420 g", mode:"flavor", chefsPick:true,
    ingredients:[{item:"Chocolade",amount:"200 g"},{item:"Room",amount:"200 g"},{item:"Boter",amount:"20 g"}],
    steps:["Verwarm de room.","Giet over de chocolade en emulgeer.","Roer de boter erdoor."],
    variations:[{name:"Pure ganache"},{name:"Melkchocoladeganache",add:"Iets minder room."},{name:"Witte ganache",add:"Meer chocolade voor stevigheid."},{name:"Koffieganache",add:"Trek de room met koffie."},{name:"Frambozenganache",add:"Deel room vervangen door frambozenpüree."},{name:"Muntganache",add:"Trek met verse munt; zeef."},{name:"Kweeperenganache",add:"Vervang deel room door kweeperenpuree."},{name:"Lavendelganache",add:"Trek kort met lavendel."}] },
  { id:"anglaise", baseName:"Crème anglaise", generic:"vanille", category:"Zoet & patisserie", yield:"≈ 550 g", mode:"flavor", chefsPick:true,
    ingredients:[{item:"Melk",amount:"250 g"},{item:"Room",amount:"250 g"},{item:"Eidooiers",amount:"5 stuks"},{item:"Suiker",amount:"60 g"}],
    steps:["Verwarm melk en room.","Klop dooiers met suiker; bind tot 82°C.","Passeer en koel snel."],
    variations:[{name:"Vanille-anglaise",add:"Trek met vanille."},{name:"Koffie-anglaise",add:"Trek met koffie."},{name:"Citroenmelisse-anglaise",add:"Trek met citroenmelisse uit de tuin."},{name:"Laurier-anglaise",add:"Trek kort met verse laurier."},{name:"Salie-anglaise",add:"Trek met salie."},{name:"Kamille-anglaise",add:"Trek met kamillebloemen."}] },
  { id:"icecream", baseName:"Roomijs", generic:"vanille", category:"Sorbet & ijs", yield:"≈ 900 g", mode:"flavor", chefsPick:true, gear:"Sorbetmachine",
    ingredients:[{item:"Melk",amount:"500 g"},{item:"Room",amount:"250 g"},{item:"Eidooiers",amount:"6 stuks"},{item:"Suiker",amount:"150 g"}],
    steps:["Maak een anglaise (82°C).","Rijp 12 uur.","Draai in de sorbetmachine."],
    variations:[{name:"Vanille-roomijs",add:"Trek met vanille."},{name:"Karamel-roomijs",add:"Deel suiker vervangen door karamel."},{name:"Hazelnoot-roomijs",add:"Roer pralinépasta erdoor."},{name:"Braam-roomijs",add:"Roer braampüree door de gerijpte basis."},{name:"Aardbei-roomijs",add:"Roer aardbeienpüree erdoor."},{name:"Rabarber-roomijs",add:"Roer rabarbercompote erdoor."},{name:"Honing-tijm-roomijs",add:"Zoet met honing en trek met tijm."}] },
  { id:"caramel", baseName:"Karamel", generic:"karamel", category:"Zoet & patisserie", yield:"≈ 350 g", mode:"flavor",
    ingredients:[{item:"Suiker",amount:"200 g"},{item:"Room",amount:"150 g"},{item:"Boter",amount:"40 g"}],
    steps:["Smelt de suiker amberkleurig.","Blus met warme room.","Roer de boter erdoor."],
    variations:[{name:"Klassieke karamel"},{name:"Gezouten karamel",add:"Werk af met flor de sel."},{name:"Miso-karamel",add:"Roer witte miso erdoor."},{name:"Boterscotch",add:"Bruine suiker en extra boter."}] },
  { id:"beurreblanc", baseName:"Beurre blanc", generic:"boter", category:"Sauzen & emulsies", yield:"≈ 300 g", mode:"flavor", chefsPick:true, endorsements:["Michael"],
    ingredients:[{item:"Sjalot",amount:"1 stuk"},{item:"Witte wijn",amount:"100 g"},{item:"Azijn",amount:"50 g"},{item:"Koude boter",amount:"200 g"}],
    steps:["Reduceer tot bijna droog.","Monteer koude boter buiten het vuur.","Passeer; niet koken."],
    variations:[{name:"Klassieke beurre blanc"},{name:"Dille-beurre blanc",add:"Roer dille erdoor."},{name:"Dragon-beurre blanc",add:"Roer dragon erdoor."},{name:"Beurre rouge",add:"Rode wijn i.p.v. witte."},{name:"Mosterd-beurre blanc",add:"Lepel mosterd erdoor."}] },
  { id:"mayo", baseName:"Emulsie / mayonaise", generic:"emulsie", category:"Sauzen & emulsies", yield:"≈ 300 g", mode:"flavor", chefsPick:true,
    ingredients:[{item:"Eidooier",amount:"1 stuk"},{item:"Mosterd",amount:"10 g"},{item:"Neutrale olie",amount:"250 g"},{item:"Azijn",amount:"10 g"}],
    steps:["Klop dooier met mosterd.","Druppel de olie erbij.","Op smaak met azijn."],
    variations:[{name:"Klassieke mayonaise"},{name:"Aioli",add:"Knoflook uit de tuin."},{name:"Bieslookmayonaise",add:"Fijne bieslook erdoor."},{name:"Mosterdmayonaise",add:"Extra grove mosterd."},{name:"Sojasaus-mayonaise",add:"Werk af met sojasaus."},{name:"Oost-Indische-kersmayonaise",add:"Roer fijne blaadjes erdoor voor peperigheid."}] },
  { id:"vinaigrette", baseName:"Vinaigrette", generic:"vinaigrette", category:"Oliën & vinaigrettes", yield:"≈ 150 g", mode:"flavor",
    ingredients:[{item:"Azijn",amount:"30 g"},{item:"Olie",amount:"90 g"},{item:"Mosterd",amount:"5 g"}],
    steps:["Klop azijn met mosterd en zout.","Monteer met olie."],
    variations:[{name:"Klassieke vinaigrette"},{name:"Sjalottenvinaigrette",add:"Fijne sjalot erdoor."},{name:"Honing-mosterdvinaigrette",add:"Honing toevoegen."},{name:"Dragonvinaigrette",add:"Dragon erdoor."},{name:"Frambozenvinaigrette",add:"Frambozenazijn + wat püree."}] },
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
    mains:[...ROOT,...STALK,...BRASSICA,...BEAN],
    ingredients:[{item:"{X}",amount:"800 g"},{item:"Olijfolie",amount:"3 el"},{item:"Zout",amount:"naar smaak"},{item:"Tijm",amount:"enkele takjes"}],
    steps:["Maak de {x} schoon en snijd in gelijke stukken.","Meng met olie, zout en tijm.","Rooster op 200°C tot gaar en gekaramelliseerd."] },
  { id:"grill", baseName:"Gegrilde tuingroente", varTemplate:"Gegrilde {x}", generic:"tuingroente", category:"Tuin · gegrild", yield:"4 porties", gear:"Black Bastard",
    mains:[...ROOT,...STALK,"spitskool","palmkool","savooikool"],
    ingredients:[{item:"{X}",amount:"600 g"},{item:"Olie",amount:"2 el"},{item:"Zout",amount:"naar smaak"}],
    steps:["Grill de {x} op de Black Bastard tot mooie strepen.","Gaar door aan de koele kant of in de combi-oven.","Maak af met zout en olie."] },
  { id:"steam", baseName:"Gestoomde tuingroente", varTemplate:"Gestoomde {x}", generic:"tuingroente", category:"Tuin · gestoomd", yield:"4 porties", gear:"Combi-oven",
    mains:[...ROOT.slice(0,10),...STALK,...BRASSICA.slice(0,4)],
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
    mains:[...ROOT,"erwten","venkel","bleekselderij"],
    ingredients:[{item:"Püree van {x}",amount:"400 g"},{item:"Room",amount:"100 g"},{item:"Gelatineblaadje",amount:"1 blaadje"}],
    steps:["Meng warme püree van {x} met room en gelatine.","Passeer en vul een sifon; 2 patronen.","Koel 2 uur; schud voor gebruik."] },
  { id:"ggel", baseName:"Tuingel", noun:"Gel", generic:"tuingroente", category:"Gels & sauzen", yield:"≈ 400 g", gear:"Thermoblender",
    mains:[...ROOT,...STALK],
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
    mains:GHERB,
    ingredients:[{item:"Zachte boter",amount:"250 g"},{item:"{X}, fijn",amount:"30 g"},{item:"Zout",amount:"snuf"}],
    steps:["Meng de zachte boter met de {x} en zout.","Rol op in folie.","Koel tot stevig."] },
  { id:"gpesto", baseName:"Pesto", varTemplate:"Pesto van {x}", generic:"kruid", category:"Sauzen & emulsies", yield:"≈ 300 g",
    mains:GHERB.slice(0,8),
    ingredients:[{item:"{X}",amount:"80 g"},{item:"Pompoenpit of amandel",amount:"30 g"},{item:"Kaas",amount:"40 g"},{item:"Olijfolie",amount:"120 g"}],
    steps:["Rooster de pitten.","Mix {x}, pitten en kaas grof.","Monteer met olie; op smaak."] },
  { id:"gherbgel", baseName:"Kruidengel", noun:"Gel", generic:"kruid", category:"Gels & sauzen", yield:"≈ 300 g", gear:"Thermoblender",
    mains:GHERB.slice(0,10),
    ingredients:[{item:"Sap van {x}",amount:"300 g"},{item:"Agar-agar",amount:"3 g"}],
    steps:["Kook sap van {x} met agar 2 min.","Opstijven en glad mixen.","Passeer in een knijpfles."] },
  { id:"fvinegar", baseName:"Bloemenazijn", varTemplate:"Azijn van {x}", generic:"bloem", category:"Oliën & vinaigrettes", yield:"≈ 300 g",
    mains:GFLOWER,
    ingredients:[{item:"{X}",amount:"30 g"},{item:"Witte-wijnazijn",amount:"300 g"}],
    steps:["Doe de {x} in de azijn.","Laat 2 weken op een donkere plek trekken.","Zeef en bottel."] },
  { id:"pflower", baseName:"Gepekelde bloemen", varTemplate:"Gepekelde {x}", generic:"bloem", category:"Pickles & zuur", yield:"≈ 150 g",
    mains:GFLOWER,
    ingredients:[{item:"{X}",amount:"50 g"},{item:"Rijstazijn",amount:"100 g"},{item:"Suiker",amount:"30 g"},{item:"Zout",amount:"3 g"}],
    steps:["Breng de pekel aan de kook en laat afkoelen.","Leg de {x} onder de pekel.","Laat minimaal 1 dag trekken."] },
  { id:"candyflower", baseName:"Gekonfijte bloemen", varTemplate:"Gekonfijte {x}", generic:"bloem", category:"Zoet & patisserie", yield:"naar behoefte", gear:"Droogoven",
    mains:GFLOWER,
    ingredients:[{item:"{X}",amount:"20 g"},{item:"Eiwit",amount:"1 stuk"},{item:"Fijne suiker",amount:"100 g"}],
    steps:["Bestrijk de {x} dun met eiwit.","Bestrooi met suiker.","Droog in de droogoven tot krokant."] },

  // ---- TUIN: fruit ----
  { id:"gsorbet", baseName:"Tuinsorbet", noun:"Sorbet", generic:"tuinfruit", category:"Sorbet & ijs", yield:"≈ 700 g", chefsPick:true, gear:"Sorbetmachine",
    mains:GFRUIT,
    ingredients:[{item:"Püree van {x}",amount:"500 g"},{item:"Suikersiroop",amount:"150 g"},{item:"Glucose",amount:"30 g"},{item:"Citroensap",amount:"15 g"}],
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
    ingredients:[{item:"Püree van {x}",amount:"300 g"},{item:"Poedersuiker",amount:"40 g"},{item:"Citroensap",amount:"10 g"}],
    steps:["Mix alles glad.","Op smaak; verdun voor een lopende saus.","Passeer en koel."] },
  { id:"gdry", baseName:"Gedroogd fruitpoeder", varTemplate:"Poeder van {x}", generic:"tuinfruit", category:"Krokant & garnituur", yield:"≈ 60 g", gear:"Droogoven",
    mains:GFRUIT,
    ingredients:[{item:"Püree van {x}",amount:"300 g"}],
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
  { id:"lacto", baseName:"Melkzuurgefermenteerde groente", varTemplate:"Gefermenteerde {x}", generic:"tuingroente", category:"Fermentatie", yield:"1 pot", ferment:true, fermentDefaults:{saltPct:2,tempC:20,days:10}, chefsPick:true, endorsements:["Simon","Stef"], gear:"Fermentatiemateriaal",
    mains:[...ROOT,...BRASSICA,...STALK,...BEAN],
    ingredients:[{item:"{X}",amount:"1 kg"},{item:"Zout (2%)",amount:"20 g"},{item:"Water (indien nodig)",amount:"naar behoefte"}],
    steps:["Weeg de {x} en 2% zout af.","Kneus of meng tot vocht vrijkomt; pak strak in onder de pekel.","Ferment 7–14 dagen op ±20°C; proef en koel bij de gewenste zuurte."] },
  { id:"kraut", baseName:"Zuurkoolstijl", varTemplate:"Zuurkool van {x}", generic:"kool", category:"Fermentatie", yield:"1 pot", ferment:true, fermentDefaults:{saltPct:2,tempC:20,days:21}, gear:"Fermentatiemateriaal",
    mains:BRASSICA,
    ingredients:[{item:"{X}, gesneden",amount:"1 kg"},{item:"Zout (2%)",amount:"20 g"}],
    steps:["Snijd de {x} fijn en meng met 2% zout.","Kneed tot er pekel vrijkomt en stamp aan onder het vocht.","Ferment 2–4 weken op ±20°C; koel bij gewenste zuurte."] },
  { id:"kimchi", baseName:"Kimchi-stijl", varTemplate:"Kimchi van {x}", generic:"kool", category:"Fermentatie", yield:"1 pot", ferment:true, fermentDefaults:{saltPct:2.5,tempC:20,days:5}, gear:"Fermentatiemateriaal",
    mains:["chinese kool","paksoi","amsoi","rode kool","koolrabi","radijs"],
    ingredients:[{item:"{X}",amount:"1 kg"},{item:"Zout",amount:"25 g"},{item:"Kimchipasta (ui, knoflook, gember, chili)",amount:"200 g"}],
    steps:["Zout de {x} en laat 2 uur wellen; spoel en dep.","Meng met de pasta.","Ferment 3–7 dagen op ±20°C; daarna koelen."] },
  { id:"fhot", baseName:"Gefermenteerde hotsauce", varTemplate:"Hotsauce van {x}", generic:"groente", category:"Fermentatie", yield:"≈ 500 g", ferment:true, fermentDefaults:{saltPct:2.5,tempC:22,days:14}, gear:"Fermentatiemateriaal",
    mains:["tomaat","radijs","ui","knoflook","rode biet"],
    ingredients:[{item:"{X} + chili",amount:"500 g"},{item:"Zout (2,5%)",amount:"13 g"}],
    steps:["Mix de {x} met chili en zout.","Ferment 1–2 weken onder pekel op ±22°C.","Mix glad, passeer en bottel; koel."] },
  { id:"fcaper", baseName:"Gefermenteerde bloemknoppen", varTemplate:"Kappertjes van {x}", generic:"bloem", category:"Fermentatie", yield:"1 pot", ferment:true, fermentDefaults:{saltPct:3.5,tempC:20,days:7}, gear:"Fermentatiemateriaal",
    mains:["oost-indische kers","goudsbloem","leeuwenbek","afrikaantjes","dahlia"],
    ingredients:[{item:"Knoppen van {x}",amount:"200 g"},{item:"Zout (3,5%)",amount:"7 g"},{item:"Water",amount:"200 g"}],
    steps:["Leg de knoppen onder een 3,5% pekel.","Ferment 1–2 weken op ±20°C.","Bewaar in de pekel; gebruik als kappertjes."] },

  // ---- voorraad-basistechnieken (extra breedte) ----
  { id:"coulis", baseName:"Fruitcoulis", noun:"Coulis", generic:"fruit", category:"Gels & sauzen", yield:"≈ 350 g", mains:FRUIT_ONLY,
    ingredients:[{item:"Püree van {x}",amount:"300 g"},{item:"Poedersuiker",amount:"40 g"},{item:"Citroensap",amount:"10 g"}],
    steps:["Mix püree van {x} met suiker en citroen.","Verdun voor een lopende saus.","Passeer en koel."] },
  { id:"compote", baseName:"Fruitcompote", noun:"Compote", generic:"fruit", category:"Compotes & jam", yield:"≈ 400 g", mains:FRUIT_ONLY,
    ingredients:[{item:"{X} in stukken",amount:"400 g"},{item:"Suiker",amount:"80 g"},{item:"Citroensap",amount:"10 g"}],
    steps:["Wel de {x} met suiker.","Kook zachtjes in tot compote.","Op smaak en koel."] },
  { id:"jam", baseName:"Fruitconfituur", noun:"Confituur", generic:"fruit", category:"Compotes & jam", yield:"≈ 3 potten", mains:FRUIT_ONLY,
    ingredients:[{item:"{X}",amount:"500 g"},{item:"Geleisuiker",amount:"500 g"},{item:"Citroensap",amount:"20 g"}],
    steps:["Kook met geleisuiker.","4 min doorkoken; test op een koud bordje.","Vul potten heet af."] },
  { id:"fpowder", baseName:"Fruitpoeder", varTemplate:"Poeder van {x}", generic:"fruit", category:"Krokant & garnituur", yield:"≈ 60 g", gear:"Droogoven", mains:FRUIT_ONLY,
    ingredients:[{item:"Püree van {x}",amount:"300 g"}],
    steps:["Strijk dun uit op een mat.","Droog op 60°C tot leerachtig.","Maal tot poeder."] },
  { id:"pearl", baseName:"Fruitparels", varTemplate:"Parels van {x}", generic:"fruit", category:"Garnituur", yield:"≈ 150 g", mains:FRUIT,
    ingredients:[{item:"Sap van {x}",amount:"200 g"},{item:"Agar-agar",amount:"2 g"},{item:"IJskoude olie",amount:"500 ml"}],
    steps:["Kook sap van {x} met agar.","Druppel in ijskoude olie.","Zeef en spoel."] },
  { id:"fchip", baseName:"Fruitchip", varTemplate:"Fruitchip van {x}", generic:"fruit", category:"Krokant & garnituur", yield:"≈ 20 chips", gear:"Droogoven", mains:FRUIT,
    ingredients:[{item:"Dunne plakjes {x}",amount:"1 stuk"},{item:"Poedersuiker",amount:"naar behoefte"}],
    steps:["Snijd flinterdun.","Bestrooi licht met suiker.","Droog op 90°C tot krokant."] },
  { id:"fleather", baseName:"Fruitleer", varTemplate:"Fruitleer van {x}", generic:"fruit", category:"Krokant & garnituur", yield:"1 vel", gear:"Droogoven", mains:FRUIT,
    ingredients:[{item:"Püree van {x}",amount:"400 g"},{item:"Suiker",amount:"30 g"}],
    steps:["Strijk de püree dun uit.","Droog op 60°C tot buigzaam.","Snijd op maat."] },
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
    ingredients:[{item:"Püree van {x}",amount:"400 g"},{item:"Room",amount:"100 g"},{item:"Gelatineblaadje",amount:"1 blaadje"}],
    steps:["Meng warme püree van {x} met room en gelatine.","Vul een sifon; 2 patronen.","Koel; schud voor gebruik."] },
  { id:"vpickle", baseName:"Gepekelde groente (voorraad)", varTemplate:"Gepekelde {x}", generic:"groente", category:"Pickles & zuur", yield:"≈ 400 g", mains:VEG_ONLY,
    ingredients:[{item:"{X}",amount:"400 g"},{item:"Azijn",amount:"200 g"},{item:"Suiker",amount:"80 g"},{item:"Zout",amount:"8 g"}],
    steps:["Snijd de {x} op maat.","Kook de pekel en giet over de {x}.","Laat minimaal 1 uur trekken."] },
  { id:"vchip", baseName:"Groentechip (voorraad)", varTemplate:"Groentechip van {x}", generic:"groente", category:"Krokant & garnituur", yield:"≈ 20 chips", gear:"iVario", mains:VEG_ONLY,
    ingredients:[{item:"Dunne plakjes {x}",amount:"1 stuk"},{item:"Zout",amount:"naar smaak"}],
    steps:["Snijd flinterdun.","Frituur of droog krokant.","Zout licht."] },
  { id:"vgel", baseName:"Groentegel (voorraad)", noun:"Gel", generic:"groente", category:"Gels & sauzen", yield:"≈ 400 g", gear:"Thermoblender", mains:VEG_ONLY,
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
    steps:["Klop dooiers met reductie au bain tot ruban.","Monteer met de boter.","Op smaak met citroen."],
    variations:[{name:"Hollandaise"},{name:"Béarnaise",add:"Dragonreductie en verse dragon."},{name:"Choron",add:"Tomatenconcentraat door de béarnaise."},{name:"Maltaise",add:"Bloedsinaasappel."},{name:"Mousseline",add:"Opgeslagen room erdoor."},{name:"Paloise",add:"Munt i.p.v. dragon."}] },
  { id:"sponge", baseName:"Sifon-spons", generic:"spons", category:"Zoet & patisserie", yield:"≈ 8 stuks", mode:"flavor", gear:"Sifon",
    ingredients:[{item:"Eiwit",amount:"100 g"},{item:"Eidooier",amount:"60 g"},{item:"Suiker",amount:"60 g"},{item:"Bloem",amount:"40 g"}],
    steps:["Mix glad en passeer in een sifon.","2 patronen; vul bekers tot een derde.","Gaar 40 sec in de magnetron."],
    variations:[{name:"Bietenspons",add:"Kleur met bietenpoeder."},{name:"Basilicumspons",add:"Verse basilicum door het beslag."},{name:"Citroenspons",add:"Citroenrasp."},{name:"Chocoladespons",add:"Cacao toevoegen."},{name:"Pistachespons",add:"Pistachepasta."},{name:"Zuringspons",add:"Verse zuring door het beslag."},{name:"Peterseliespons",add:"Blancheerde peterselie door het beslag."}] },
  { id:"granita", baseName:"Granité", generic:"fruit", category:"Sorbet & ijs", yield:"≈ 700 g", mode:"flavor", gear:"Vriezer",
    ingredients:[{item:"Sap of aftreksel",amount:"600 g"},{item:"Suiker",amount:"80 g"},{item:"Citroensap",amount:"15 g"}],
    steps:["Meng en breng op smaak.","Vries in en schraap elk half uur met een vork.","Bewaar luchtig bevroren."],
    variations:[{name:"Aardbei-granité"},{name:"Framboos-granité"},{name:"Druiven-granité"},{name:"Appel-granité"},{name:"Rabarber-granité"},{name:"Citroenmelisse-granité"},{name:"Munt-granité"},{name:"Kamille-granité"}] },
  { id:"kruidensuiker", baseName:"Kruidensuiker", varTemplate:"Suiker van {x}", generic:"kruid", category:"Zoet & patisserie", yield:"≈ 220 g", gear:"Droogoven", mains:[...GHERB,"lavendel"],
    ingredients:[{item:"{X}",amount:"20 g"},{item:"Suiker",amount:"200 g"}],
    steps:["Droog de {x} in de droogoven.","Vermaal met de suiker.","Bewaar droog en afgesloten."] },

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

function buildLibrary() {
  const out = [];
  for (const b of BASES) {
    const noun = b.noun || b.baseName;
    out.push({
      id: b.id, name: b.baseName + " (basis)", category: b.category, yield: b.yield,
      ingredients: b.ingredients.map((x) => ({ item: fill(x.item, b.generic), amount: x.amount })),
      steps: b.steps.map((s) => fill(s, b.generic)),
      endorsements: b.endorsements ? [...b.endorsements] : [], chefsPick: !!b.chefsPick,
      baseId: null, baseName: null, isBase: true, season: ["Hele jaar"], garden: false,
      diet: b.diet || "Vegetarisch", ferment: !!b.ferment, fermentDefaults: b.fermentDefaults || null,
      gear: b.gear || null, updatedBy: "Keukenteam", updatedAt: "startbibliotheek",
    });
    if (b.mode === "flavor") {
      for (const v of b.variations) {
        out.push({
          id: b.id + "-" + slug(v.name), name: v.name, category: b.category, yield: b.yield,
          ingredients: b.ingredients.map((x) => ({ ...x })),
          steps: v.add ? [...b.steps, "Variatie: " + v.add] : [...b.steps],
          endorsements: [], chefsPick: false, baseId: b.id, baseName: b.baseName, isBase: false,
          season: ["Hele jaar"], garden: false, diet: b.diet || "Vegetarisch",
          ferment: !!b.ferment, fermentDefaults: b.fermentDefaults || null, gear: b.gear || null,
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
          ferment: !!b.ferment, fermentDefaults: b.fermentDefaults || null, gear: b.gear || null,
          updatedBy: "Keukenteam", updatedAt: "startbibliotheek",
        });
      }
    }
  }
  return out;
}

const CURATED = [
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
    plating:"Quenelle mousse van tomaat, gerookte mozzarella, gel van basilicum, olijvencrumble en balsamicoparels.",
    recipeIds:["mousse-tomaat","c-caprese-mozz","gherbgel-munt","c-olive-crumble","c-balsamic-pearls"],
    updatedBy:"Michael", updatedAt:"2 dagen geleden" },
  { id:"d2", name:"Drie bieten uit eigen tuin", course:"Herfstvoorgerecht", season:["Herfst"], diet:"Vegetarisch",
    description:"Rode, gele en chioggia biet in verschillende texturen, met appel en dragon.",
    plating:"Geroosterde rode biet, carpaccio van chioggia biet, gepekelde gele biet, compote van appel en olie van dragon.",
    recipeIds:["roast-rode-biet","gcarp-chioggia-biet","gpickle-gele-biet","gcompote-appel","gherboil-dragon"],
    updatedBy:"Stef", updatedAt:"1 dag geleden" },
  { id:"d3", name:"Courgette & tuinbloemen", course:"Zomergerecht", season:["Zomer"], diet:"Vegetarisch",
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
    recipeIds:["mousse-tomaat","gtartaar-tomaat","fhot-tomaat","gherboil-bieslook","c-olive-crumble"],
    updatedBy:"Michael", updatedAt:"1 dag geleden" },
  { id:"d8", name:"Venkel, peer & walnoot", course:"Herfstvoorgerecht", season:["Herfst"], diet:"Vegetarisch",
    description:"Gegrilde venkel met gepocheerde peer en een noot van walnoot.",
    plating:"Gegrilde venkel, gel van venkel, gepocheerde peer, olie van dragon en pasta van walnoot.",
    recipeIds:["grill-venkel","ggel-venkel","gpoach-peer","gherboil-dragon","nutpaste-walnoot"],
    updatedBy:"Simon", updatedAt:"2 dagen geleden" },
  { id:"d9", name:"Erwt, munt & radijs", course:"Lentegerecht", season:["Lente"], diet:"Vegetarisch",
    description:"Zoete erwten uit de tuin met frisse munt en knapperige radijs.",
    plating:"Espuma van erwten, puree van erwten, gepekelde radijs, olie van munt en gel van munt.",
    recipeIds:["gespuma-erwten","beanpuree-erwten","gpickle-radijs","gherboil-munt","gherbgel-munt"],
    updatedBy:"Isa", updatedAt:"2 dagen geleden" },
  { id:"d10", name:"Rabarber & kamille", course:"Lentedessert", season:["Lente"], diet:"Vegetarisch",
    description:"Rabarber uit de tuin, licht bloemig met kamille.",
    plating:"Gepocheerde rabarber, sorbet van rabarber, coulis van rabarber, anglaise van kamille en gekonfijte kamille.",
    recipeIds:["gpoach-rabarber","gsorbet-rabarber","gcoulis-rabarber","anglaise-kamille-anglaise","candyflower-kamille"],
    updatedBy:"Isa", updatedAt:"3 dagen geleden" },
  { id:"d11", name:"Wortel in texturen", course:"Herfstgerecht", season:["Herfst","Winter"], diet:"Vegetarisch",
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
  { id:"d15", name:"Courgette, bloem & munt", course:"Zomergerecht", season:["Zomer"], diet:"Vegetarisch",
    description:"Gegrilde courgette met eetbare bloem en frisse munt.",
    plating:"Gegrilde courgette, tartaar van courgette, gepekelde courgettebloem, olie van munt en azijn van goudsbloem.",
    recipeIds:["grill-courgette","gtartaar-courgette","pflower-courgettebloem","gherboil-munt","fvinegar-goudsbloem"],
    updatedBy:"Kim", updatedAt:"4 dagen geleden" },
  { id:"d16", name:"Pruim, amandel & laurier", course:"Zomerdessert", season:["Zomer","Herfst"], diet:"Vegetarisch",
    description:"Zoete pruim en reine claude met amandel en een vleugje laurier.",
    plating:"Gepocheerde pruim, sorbet van pruim, compote van reine claude, pasta van amandel en anglaise van laurier.",
    recipeIds:["gpoach-pruim","gsorbet-pruim","gcompote-reine-claude","nutpaste-amandel","anglaise-laurier-anglaise"],
    updatedBy:"Isa", updatedAt:"5 dagen geleden" },
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
  { id:"b1", product:"Zuurkool van rode kool", type:"Zuurkool", startDate:"2026-07-08", days:21, saltPct:2, tempC:20, amount:"3 kg", pH:3.6, notes:"Mooie zuurgraad, bijna klaar.", done:false, by:"Simon" },
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
.ff:focus{outline:none;box-shadow:0 0 0 2px #3a4b30}
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

  const saveRecipe = (data, editingId) => {
    const stamped = { ...data, updatedBy: user.name, updatedAt: "zojuist" };
    if (editingId) setRecipes((rs) => rs.map((r) => (r.id === editingId ? { ...r, ...stamped } : r)));
    else setRecipes((rs) => [{ ...stamped, id: "r" + Date.now(), endorsements: [], chefsPick: false, baseId: null, isBase: false, season: ["Hele jaar"], garden: false, diet: "Vegetarisch", ferment: false }, ...rs]);
    flash("Opgeslagen — zichtbaar voor het hele team");
  };
  const saveDish = (data, editingId) => {
    const stamped = { ...data, updatedBy: user.name, updatedAt: "zojuist" };
    if (editingId) setDishes((ds) => ds.map((d) => (d.id === editingId ? { ...d, ...stamped } : d)));
    else setDishes((ds) => [{ ...stamped, id: "d" + Date.now() }, ...ds]);
    flash("Opgeslagen — zichtbaar voor het hele team");
  };
  const saveBatch = (data) => { setBatches((bs) => [{ ...data, id: "b" + Date.now(), by: user.name }, ...bs]); flash("Batch geregistreerd"); };
  const toggleBatchDone = (id) => setBatches((bs) => bs.map((b) => (b.id === id ? { ...b, done: !b.done } : b)));
  const toggleEndorse = (id) => setRecipes((rs) => rs.map((r) => r.id === id ? { ...r, endorsements: r.endorsements.includes(user.name) ? r.endorsements.filter((n) => n !== user.name) : [...r.endorsements, user.name] } : r));
  const toggleChefsPick = (id) => setRecipes((rs) => rs.map((r) => (r.id === id ? { ...r, chefsPick: !r.chefsPick } : r)));

  if (!user) return <><BrandCSS /><Login onPick={setUser} /></>;
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
      <Header user={user} onHome={goHome} onOpenSettings={() => push({ screen: "settings" })} onSignOut={() => { setUser(null); resetTo({ screen: "list" }); }} />

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 pb-28">
        {current.screen === "list" && (
          <>
            <SectionNav section={section} setSection={(s) => { setSection(s); setSearch(""); }} />
            {section === "gerechten" && <DishList dishes={dishes} search={search} setSearch={setSearch} onOpen={(id) => push({ screen: "dishDetail", id })} />}
            {section === "recepten" && <RecipeList recipes={recipes} search={search} setSearch={setSearch} onOpen={openRecipe} />}
            {section === "fermentatie" && <FermentList batches={batches} recipes={recipes} canEdit={canEdit} onToggleDone={toggleBatchDone} onOpenRecipe={openRecipe} />}
            {section === "smaak" && <FlavorList onSearchRecipes={(n) => { setSection("recepten"); setSearch(n); }} />}
          </>
        )}
        {current.screen === "dishDetail" && <DishDetail dish={dishById(current.id)} recipeById={recipeById} canEdit={canEdit} onBack={goBack} onEdit={() => push({ screen: "dishForm", editing: current.id })} onOpenRecipe={openRecipe} />}
        {current.screen === "recipeDetail" && (() => { const r = recipeById(current.id); return (
          <RecipeDetail recipe={r} user={user} canEdit={canEdit} usageCount={usageCount(current.id)}
            baseRecipe={r?.baseId ? recipeById(r.baseId) : null} variations={r?.isBase ? variationsOf(current.id) : []}
            onBack={goBack} onEdit={() => push({ screen: "recipeForm", editing: current.id })} onEndorse={toggleEndorse}
            onChefsPick={toggleChefsPick} onOpenRecipe={openRecipe}
            onStartBatch={() => push({ screen: "batchForm", prefill: r })} />
        ); })()}
        {current.screen === "dishForm" && <DishForm dish={current.editing ? dishById(current.editing) : null} allRecipes={recipes} recipeById={recipeById} onCancel={goBack} onSave={(d) => { saveDish(d, current.editing); goBack(); }} />}
        {current.screen === "recipeForm" && <RecipeForm recipe={current.editing ? recipeById(current.editing) : null} onCancel={goBack} onSave={(d) => { saveRecipe(d, current.editing); goBack(); }} />}
        {current.screen === "batchForm" && <BatchForm prefill={current.prefill} onCancel={goBack} onSave={(d) => { saveBatch(d); setSection("fermentatie"); goBack(); }} />}
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

function Login({ onPick }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: T.paper, color: "#33352c" }}>
      <div className="w-full max-w-sm">
        <Wordmark size="large" />
        <p className="mute text-center text-sm mt-5 mb-8">Het receptenboek van de moestuinkeuken.</p>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase acc mb-3"><Lock size={13} /> Kies je naam</div>
        <div className="space-y-2">
          {TEAM.map((m) => (
            <button key={m.name} onClick={() => onPick({ ...m, canEdit: true })} className="card cardh ff w-full flex items-center gap-3 px-3 py-3 text-left">
              <span className="w-9 h-9 shrink-0 rounded-full font-semibold flex items-center justify-center serif" style={{ background: "#e8ebe0", color: T.green }}>{m.name[0]}</span>
              <span><span className="block font-medium ink">{m.name}</span><span className="block text-xs mute">{m.role}</span></span>
            </button>
          ))}
        </div>
        <button onClick={() => onPick({ name: "Gast", role: "Gast", canEdit: false })} className="ff w-full mt-3 flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm mute" style={{ border: "1px dashed #cfccbe" }}>
          <Eye size={16} /> Verder als gast (alleen lezen)
        </button>
        <p className="text-xs mute mt-5 leading-relaxed">Demo-login op naam. In de live versie krijgt elke kok een eigen beveiligd account (Supabase). Gasten kijken mee maar wijzigen niets.</p>
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

function DishList({ dishes, search, setSearch, onOpen }) {
  const q = search.trim().toLowerCase();
  const shown = dishes.filter((d) => d.name.toLowerCase().includes(q) || d.course.toLowerCase().includes(q));
  return (
    <div>
      <SearchBar value={search} onChange={setSearch} placeholder="Zoek gerechten" />
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

function FermentList({ batches, recipes, canEdit, onToggleDone, onOpenRecipe }) {
  const active = batches.filter((b) => !b.done);
  const done = batches.filter((b) => b.done);
  const fermentRecipes = recipes.filter((r) => r.ferment && !r.isBase).slice(0, 40);
  return (
    <div className="pt-4">
      <div className="card p-4 mb-4">
        <div className="flex items-center gap-2 serif ink text-lg"><FlaskConical size={17} className="acc" /> Fermentatie-batches</div>
        <p className="text-sm mute mt-1">Registreer batches met zout%, temperatuur, pH en duur. {canEdit ? "Tik op de + voor een nieuwe batch." : "Als gast kijk je mee."}</p>
      </div>
      {active.length > 0 && <Eyebrow>Actief</Eyebrow>}
      <div className="space-y-2.5">{active.map((b) => <BatchCard key={b.id} b={b} canEdit={canEdit} onToggleDone={onToggleDone} />)}</div>
      {done.length > 0 && <div className="mt-6"><Eyebrow>Afgerond</Eyebrow></div>}
      <div className="space-y-2.5">{done.map((b) => <BatchCard key={b.id} b={b} canEdit={canEdit} onToggleDone={onToggleDone} />)}</div>
      <div className="mt-6"><Eyebrow>Fermentatierecepten</Eyebrow></div>
      <div className="flex flex-wrap gap-2">
        {fermentRecipes.map((r) => <button key={r.id} onClick={() => onOpenRecipe(r.id)} className="btno ff rounded-full text-sm px-3 py-1.5">{r.name}</button>)}
      </div>
    </div>
  );
}

function BatchCard({ b, canEdit, onToggleDone }) {
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
      {canEdit && <button onClick={() => onToggleDone(b.id)} className="mt-3 text-xs font-medium acc hover:opacity-70">{b.done ? "Heropen batch" : "Markeer als afgerond"}</button>}
    </div>
  );
}

function FlavorList({ onSearchRecipes }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const shown = PAIRINGS.filter((p) => p.name.includes(q.toLowerCase()) || p.pairs.some((x) => x.includes(q.toLowerCase()))).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div>
      <div className="card p-4 mt-4 mb-3">
        <div className="flex items-center gap-2 serif ink text-lg"><Blend size={17} className="acc" /> Smaakcombinaties</div>
        <p className="text-sm mute mt-1">Inspiratie per product uit de moestuin. Tik op een product voor de partners.</p>
      </div>
      <SearchBar value={q} onChange={setQ} placeholder="Zoek een product of smaak" />
      <div className="space-y-2">
        {shown.map((p) => (
          <div key={p.name} className="card overflow-hidden">
            <button onClick={() => setOpen(open === p.name ? null : p.name)} className="ff w-full flex items-center justify-between px-4 py-3 text-left">
              <span className="serif ink text-lg flex items-center gap-2">{cap(p.name)} {SEASON[p.name] && SEASON[p.name].filter((s) => s !== "Hele jaar").map((s) => <SeasonPill key={s} s={s} />)}</span>
              <ChevronRight size={16} className={"transition-transform " + (open === p.name ? "rotate-90" : "")} style={{ color: "#c4c2b2" }} />
            </button>
            {open === p.name && (
              <div className="px-4 pb-4 -mt-1">
                <p className="text-xs mute mb-2 italic">{p.note}</p>
                <div className="flex flex-wrap gap-1.5">{p.pairs.map((x) => <span key={x} className="chip rounded-full text-xs font-medium px-2.5 py-1">{x}</span>)}</div>
                <button onClick={() => onSearchRecipes(p.name)} className="mt-3 inline-flex items-center gap-1 text-xs font-medium acc hover:opacity-70"><Search size={12} /> Bekijk recepten met {p.name}</button>
              </div>
            )}
          </div>
        ))}
        {shown.length === 0 && <Empty label="Geen combinatie gevonden." />}
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

function DishDetail({ dish, recipeById, canEdit, onBack, onEdit, onOpenRecipe }) {
  if (!dish) return null;
  return (
    <div>
      <BackBar onBack={onBack} onEdit={canEdit ? onEdit : null} />
      <div className="text-[11px] font-semibold uppercase tracking-widest acc mb-1">{dish.course}</div>
      <h1 className="serif ink text-3xl leading-tight">{dish.name}</h1>
      <div className="flex flex-wrap gap-2 mt-2.5">{dish.season && dish.season.map((s) => <SeasonPill key={s} s={s} />)}{dish.diet && dish.diet !== "Vegetarisch" && <MeatPill diet={dish.diet} />}</div>
      <p className="mute mt-2 leading-relaxed">{dish.description}</p>
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

function RecipeDetail({ recipe, user, canEdit, usageCount, baseRecipe, variations, onBack, onEdit, onEndorse, onChefsPick, onOpenRecipe, onStartBatch }) {
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
  const [translating, setTranslating] = useState(false);
  const [err, setErr] = useState(null);
  const setIng = (i, k, v) => setIngredients((a) => a.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)));
  const setStep = (i, v) => setSteps((a) => a.map((x, idx) => (idx === i ? v : x)));
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
  const submit = () => { if (!name.trim()) return; onSave({ name: name.trim(), category: category.trim() || "Zonder categorie", yield: yieldVal.trim() || "—", ingredients: ingredients.filter((x) => x.item.trim()), steps: steps.filter((x) => x.trim()) }); };
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
      <div className="text-sm font-medium ink mb-1.5">Ingrediënten</div>
      <div className="space-y-2 mb-2">{ingredients.map((ing, i) => (
        <div key={i} className="flex gap-2">
          <input className={inputCls + " flex-1"} value={ing.item} onChange={(e) => setIng(i, "item", e.target.value)} placeholder="Ingrediënt" />
          <input className={inputCls + " w-28"} value={ing.amount} onChange={(e) => setIng(i, "amount", e.target.value)} placeholder="Hoeveelheid" />
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
  const [pick, setPick] = useState("");
  const toggle = (id) => setRecipeIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const matches = (pick.trim() ? allRecipes.filter((r) => r.name.toLowerCase().includes(pick.toLowerCase())) : allRecipes).slice(0, 40);
  const submit = () => { if (!name.trim()) return; onSave({ name: name.trim(), course: course.trim() || "Gerecht", description: description.trim(), plating: plating.trim(), recipeIds, season: dish?.season || [], diet: dish?.diet || "Vegetarisch" }); };
  return (
    <div>
      <FormBar title={dish ? "Gerecht bewerken" : "Nieuw gerecht"} onCancel={onCancel} onSave={submit} />
      <Field label="Naam"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="bv. Drie bieten uit eigen tuin" /></Field>
      <Field label="Gang"><input className={inputCls} value={course} onChange={(e) => setCourse(e.target.value)} placeholder="Herfstvoorgerecht" /></Field>
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

function BatchForm({ prefill, onCancel, onSave }) {
  const fd = prefill?.fermentDefaults;
  const [product, setProduct] = useState(prefill ? prefill.name : "");
  const [type, setType] = useState("Melkzuur");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [days, setDays] = useState(fd ? String(fd.days) : "10");
  const [saltPct, setSaltPct] = useState(fd ? String(fd.saltPct) : "2");
  const [tempC, setTempC] = useState(fd ? String(fd.tempC) : "20");
  const [amount, setAmount] = useState("");
  const [pH, setPH] = useState("");
  const [notes, setNotes] = useState("");
  const submit = () => { if (!product.trim()) return; onSave({ product: product.trim(), type, startDate, days: Number(days) || 0, saltPct: Number(saltPct) || 0, tempC: Number(tempC) || 0, amount: amount.trim() || "—", pH: pH ? Number(pH) : null, notes: notes.trim(), done: false }); };
  return (
    <div>
      <FormBar title="Nieuwe batch" onCancel={onCancel} onSave={submit} saveLabel="Registreer" />
      <Field label="Product / recept"><input className={inputCls} value={product} onChange={(e) => setProduct(e.target.value)} placeholder="bv. Zuurkool van rode kool" /></Field>
      <Field label="Type"><select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>{["Melkzuur","Zuurkool","Kimchi","Hotsauce","Kappertjes","Kombucha","Anders"].map((t) => <option key={t}>{t}</option>)}</select></Field>
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
