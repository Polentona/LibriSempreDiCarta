(()=>{
if(window.__LIB_LOOKUP_LOCK)return;window.__LIB_LOOKUP_LOCK=true;
function boot(){
  const dialog=document.getElementById('editDialog'),status=document.getElementById('lookupStatus');
  if(!dialog||!status){setTimeout(boot,120);return}
  let locked=false;
  const controls=()=>[...dialog.querySelectorAll('input,textarea,select,button[type="submit"]')];
  function setLocked(on){
    if(on===locked)return;locked=on;
    for(const el of controls()){
      if(on){el.dataset.lookupPrevDisabled=el.disabled?'1':'0';el.disabled=true;el.setAttribute('aria-disabled','true')}
      else if(el.dataset.lookupPrevDisabled!==undefined){el.disabled=el.dataset.lookupPrevDisabled==='1';if(!el.disabled)el.removeAttribute('aria-disabled');delete el.dataset.lookupPrevDisabled}
    }
    dialog.classList.toggle('lookup-locked',on);
  }
  function sync(){const busy=status.classList.contains('busy')||status.classList.contains('lookup-busy')||!!status.querySelector('.lookup-book-spinner');setLocked(busy)}
  new MutationObserver(sync).observe(status,{subtree:true,childList:true,attributes:true,characterData:true,attributeFilter:['class']});
  sync();
}
boot();
})();
