// Hand truth. sub: the subtitle line expected ("" none; null = either is acceptable).
// en: true = title not English, translation expected; false = English already; null = either.
// es: englishSpeaking for the museum that held the show.
const EN_COUNTRY=new Set(['01','03','04','05','08','10','11','12','13','14','15','16','18','22','24','25','26','27','29','30','31','32','33','41','56','57','58','59','60','61','68','69','70']);
const SUB={'02':null,'06':'Influences croisées','18':'The Making of a Collector','20':'Being independent','35':'The Gentle Revolution of Venetian Painting',
 '43':'A Century of Black Figuration in Painting','44':'The Eye That Listens','46':'From Monet to Hockney (1890-2026)','51':'What It Feels Like to Be Human',
 '52':'An Obsession','54':null,'58':'A Symphony in Blue and Yellow','40':null,'70':null,'41':null};
const EN={'06':null,'35':null,'38':null,'40':true,'65':true,'02':null,'54':null};
module.exports=nn=>({sub:nn in SUB?SUB[nn]:"",en:nn in EN?EN[nn]:false,es:EN_COUNTRY.has(nn)});
