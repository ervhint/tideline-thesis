// Easy or Pro (docs/PLAN.md §6g E2). Pure, so Node tests run the script against a stand-in page.
// MODE_SCRIPT runs in <head> before first paint, so no page flashes the other mode. A share link ?mode=easy or ?mode=pro wins
// and is remembered; otherwise the stored choice; otherwise Pro. Any storage error means Pro, and the site still works.
export const MODE_KEY = 'tideline-mode';
export const MODE_SCRIPT = `(function(){var d=document.documentElement,k='${MODE_KEY}',m=null;try{m=new URLSearchParams(location.search).get('mode')}catch(e){}if(m==='easy'||m==='pro'){try{localStorage.setItem(k,m)}catch(e){}}else{try{m=localStorage.getItem(k)}catch(e){m=null}}d.setAttribute('data-mode',m==='easy'?'easy':'pro')})();`;
