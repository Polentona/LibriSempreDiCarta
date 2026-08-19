(()=>{
if(window.__LIB_BOUNDED_SERIES_V2)return;window.__LIB_BOUNDED_SERIES_V2=true;
/* Le relazioni vengono risolte dal resolver universale unico. Questo fallback resta
   intenzionalmente privo di rete per evitare ricerche duplicate e rate-limit. */
window.__LIB_RESOLVE_BOUNDED_RELATIONS=async function(){return {saga:'',prequel:'',sequel:'',authoritative:false,checked:false,source:''}};
})();
