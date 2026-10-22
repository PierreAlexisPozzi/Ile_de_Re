# Génère src/world/geo/coast.js à partir des données géographiques réelles.
#
#   curl -A ile-de-re -o nomi.json "https://nominatim.openstreetmap.org/search?q=%C3%8Ele+de+R%C3%A9&format=json&polygon_geojson=1&limit=1"
#   curl -o c17.geojson "https://cdn.jsdelivr.net/gh/gregoiredavid/france-geojson@master/departements/17-charente-maritime/communes-17-charente-maritime.geojson"
#   python3 dev/tools/gen_coast.py
#
# Contour de l'île : OpenStreetMap (ODbL). Continent : limites communales (france-geojson).
import json, math
LON_C, LAT_C, S = -1.4077, 46.2005, 15.0
KX = 111320*math.cos(math.radians(46.2))/S
KZ = 111132/S
def P(lon, lat): return ((lon-LON_C)*KX, -(lat-LAT_C)*KZ)
def dp(pts, eps):
    if len(pts)>4 and pts[0]==pts[-1]:
        m=len(pts)//2
        a=dp1(pts[:m+1],eps); b=dp1(pts[m:],eps)
        return a[:-1]+b[:-1]
    return dp1(pts,eps)
def dp1(pts, eps):
    # Douglas-Peucker itératif
    keep=[False]*len(pts); keep[0]=keep[-1]=True
    stack=[(0,len(pts)-1)]
    while stack:
        a,b=stack.pop()
        ax,ay=pts[a]; bx,by=pts[b]; dx,dy=bx-ax,by-ay; L=math.hypot(dx,dy) or 1e-9
        best,bi=-1,-1
        for i in range(a+1,b):
            px,py=pts[i]
            d=abs(dy*px-dx*py+bx*ay-by*ax)/L
            if d>best: best,bi=d,i
        if best>eps: keep[bi]=True; stack+=[(a,bi),(bi,b)]
    return [p for p,k in zip(pts,keep) if k]
isl=json.load(open('nomi.json'))[0]['geojson']['coordinates'][0]
ring=[P(*q) for q in isl]
r2=dp(ring,0.9)
print('island', len(ring),'->',len(r2))
xs=[p[0] for p in r2]; zs=[p[1] for p in r2]; print('bbox',min(xs),max(xs),min(zs),max(zs))
main=[]
d=json.load(open('c17.geojson'))
for f in d['features']:
    g=f['geometry']; polys=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
    for p in polys:
        lons=[q[0] for q in p[0]]; lats=[q[1] for q in p[0]]
        if min(lons)>-1.10 or max(lons)<-1.25 or max(lats)<46.08 or min(lats)>46.32: continue
        if f['properties']['nom'] in ('Rivedoux-Plage',): continue
        rr=dp([P(*q) for q in p[0]],2.5)
        main.append(rr)
print('mainland rings',len(main))
def flat(r): return ','.join('%.1f,%.1f'%p for p in r)
js = '''// Géographie réelle de l'île de Ré, projetée en coordonnées de jeu.
// Contour : OpenStreetMap (relation « Île de Ré », © contributeurs OpenStreetMap,
// licence ODbL), simplifié. Continent : limites communales de Charente-Maritime
// (france-geojson, données IGN/OSM). Généré par un script, ne pas éditer à la main.
//
// Projection : x = (lon - LON_C) * KX (est), z = -(lat - LAT_C) * KZ (nord = z négatif).
// Une unité de monde vaut environ %d m à l'échelle de l'île (les villes, elles,
// sont à l'échelle humaine : 1 unité = 1 m).

export const LON_C = %s, LAT_C = %s;
export const KX = %.4f, KZ = %.4f;
export const project = (lon, lat) => [(lon - LON_C) * KX, -(lat - LAT_C) * KZ];

export const ISLAND = [%s];

export const MAINLAND = [
%s
];
''' % (S, LON_C, LAT_C, KX, KZ, flat(r2), ',\n'.join('  [%s]'%flat(r) for r in main))
open('src/world/geo/coast.js','w').write(js)
print(len(js))
