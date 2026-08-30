// Shared SEO helpers: builds the JSON-LD block from the podcast data in index.html.
export const SITE='https://mentalpodcastshow.com/';
export const YOUTUBE='https://www.youtube.com/@mentalpodcastshow';

export function extractPodcasts(html){
  const start=html.indexOf('const podcasts=[');
  const end=html.indexOf('}];',start);
  if(start<0||end<0) throw new Error('Podcast data was not found in index.html.');
  const body=html.slice(start+'const podcasts='.length,end+2);
  // the array is plain object-literal data, so it evaluates safely on its own
  return Function(`"use strict";return (${body});`)();
}

export function buildJsonLd(podcasts){
  const topics=[...new Set(podcasts.flatMap(p=>p.topics))].sort();
  const graph=[
    {'@type':'WebSite','@id':SITE+'#website','name':'Mental Podcast Show','url':SITE,
     'alternateName':'Mental Health Podcast Directory','inLanguage':'en',
     'description':'A curated directory of mental health podcasts, searchable by topic, feeling, format and point of view.',
     'publisher':{'@id':SITE+'#organization'},
     'potentialAction':{'@type':'SearchAction',
       'target':{'@type':'EntryPoint','urlTemplate':SITE+'?q={search_term_string}'},
       'query-input':'required name=search_term_string'}},
    {'@type':'Organization','@id':SITE+'#organization','name':'Mental Podcast Show','url':SITE,
     'logo':{'@type':'ImageObject','url':SITE+'assets/mental-podcast-show-logo.webp'},
     'sameAs':[YOUTUBE],'email':'hello@mentalpodcastshow.com'},
    {'@type':'CollectionPage','@id':SITE+'#directory','url':SITE,
     'name':'Mental health podcast directory','isPartOf':{'@id':SITE+'#website'},
     'about':topics.map(t=>({'@type':'Thing','name':t})),
     'mainEntity':{'@type':'ItemList','name':'Curated mental health podcasts',
       'numberOfItems':podcasts.length,
       'itemListElement':podcasts.map((p,i)=>({'@type':'ListItem','position':i+1,
         'item':{'@type':'PodcastSeries','name':p.title,'url':p.official,
           'description':p.summary,'genre':p.topics,'inLanguage':'en',
           'author':{'@type':'Person','name':p.host},
           'publishingPrinciples':SITE+'#reference'}}))}}
  ];
  return JSON.stringify({'@context':'https://schema.org','@graph':graph});
}

export function injectJsonLd(html,json){
  const tag=`<script type="application/ld+json">${json}</script>`;
  const re=/<script type="application\/ld\+json">[\s\S]*?<\/script>/;
  return re.test(html)?html.replace(re,tag):html.replace('</head>',tag+'\n</head>');
}
