# Builds family-tree-network/website/index.html from the artifact source: self-hosted fonts, full HTML document.
import sys,re
src=open(sys.argv[1]).read(); out=sys.argv[2]
src=re.sub(r'<link rel="preconnect"[^>]*>\n','',src)
src=re.sub(r'<link rel="stylesheet" href="https://fonts.googleapis.com[^>]*>\n','',src)
faces=[]
for w in (400,500,600):
    faces.append(f"@font-face{{font-family:'Inter';font-style:normal;font-weight:{w};font-display:swap;src:url(fonts/inter-latin-{w}-normal.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}}")
    faces.append(f"@font-face{{font-family:'Inter';font-style:normal;font-weight:{w};font-display:swap;src:url(fonts/inter-latin-ext-{w}-normal.woff2) format('woff2');unicode-range:U+0100-02AF,U+0304,U+0308,U+0329,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}}")
    faces.append(f"@font-face{{font-family:'IBM Plex Sans Arabic';font-style:normal;font-weight:{w};font-display:swap;src:url(fonts/ibm-plex-sans-arabic-arabic-{w}-normal.woff2) format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0898-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC}}")
src=src.replace('<style>\n','<style>\n/* Self-hosted fonts (no Google Fonts requests). */\n'+'\n'.join(faces)+'\n',1)
i=src.index('<header class="top">'); head,body=src[:i],src[i:]
head=head.replace('<meta name="claude:viewport-fit-sides" content="cover">\n','')
doc=('<!doctype html>\n<html lang="ar" dir="rtl">\n<head>\n<meta charset="utf-8">\n'
     '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
     '<meta name="color-scheme" content="light dark">\n'
     '<link rel="icon" href="favicon.svg" type="image/svg+xml">\n'+head+'</head>\n<body>\n'+body+'</body>\n</html>\n')
open(out,'w').write(doc)
