const wfIx =
  (window.Webflow && Webflow.require && (Webflow.require('ix3') || Webflow.require('ix2') || Webflow.require('ix'))) ||
  { emit: (name) => document.dispatchEvent(new CustomEvent(name)) };

gsap.registerPlugin(ScrambleTextPlugin);

function renderSysText(selector, items, options = {}) {
  const sel = typeof selector === 'string' ? (/[#.\[\s]/.test(selector) ? selector : `#${selector}`) : null;
  const container = typeof selector === 'string' ? document.querySelector(sel) : selector;
  if (!container) return;

  if (options.replace !== false) container.innerHTML = '';

  const frag = document.createDocumentFragment();
  const targets = [];
  const wideDefault = options.wide === true;
  const stagger = Math.max(0, Number(options.stagger || 0));
  const chars = options.chars || '/><.\\][{}]!@#$^&*()_+=-~|*';
  const ease = options.ease || 'power2.inOut';
  const duration = options.duration || 2;
  const revealDelay = options.revealDelay ?? 0.1;
  const tweenLength = options.tweenLength ?? false;
  const secondClass = options.secondClass;

  for (const item of items) {
    if (item.script === true) {
      const wrap = document.createElement('span');
      wrap.className = 'ui__script';
      const targetText = htmlToText(item.text ?? '');

      const sw = document.createElement('span');
      sw.className = 'scramble-wrap';

      const dup = document.createElement('span');
      dup.className = 'text-duplicate';
      dup.innerHTML = item.text ?? '';

      const top = document.createElement('span');
      top.className = 'scramble-text dud';
      top.textContent = '';

      sw.append(dup, top);
      wrap.appendChild(sw);
      frag.appendChild(wrap);

      targets.push({ type: 'html', wrap: sw, top, dup, finalHtml: item.text ?? '', finalText: targetText });
    } else {
      const row = document.createElement('div');
      row.className = 'sys--text' + ((item.wide ?? wideDefault) ? ' wide' : '');
      const nameWrap = createScrambleNode(item.name ?? '');
      const textWrap = createScrambleNode(item.text ?? '');

      if (secondClass) {
        if (Array.isArray(secondClass)) textWrap.wrap.classList.add(...secondClass);
        else textWrap.wrap.classList.add(secondClass);
      }
      if (item.secondClass) {
        if (Array.isArray(item.secondClass)) textWrap.wrap.classList.add(...item.secondClass);
        else textWrap.wrap.classList.add(item.secondClass);
      }

      row.append(nameWrap.wrap, textWrap.wrap);
      frag.appendChild(row);
      targets.push({ type: 'text', wrap: nameWrap.wrap, top: nameWrap.top, dup: nameWrap.dup, finalText: item.name ?? '' });
      targets.push({ type: 'text', wrap: textWrap.wrap, top: textWrap.top, dup: textWrap.dup, finalText: item.text ?? '' });
    }
  }

  container.appendChild(frag);

  document.fonts.ready.then(() => {
    targets.forEach((t, i) => {
      const start = () => {
        const finalText = t.finalText;
        const top = t.top;
        top.textContent = '';
        top.classList.add('dud');
        t.wrap.classList.add('scrambling');
        t.wrap.style.setProperty('--cursor-index', 0);
        t.wrap.style.setProperty('--reveal-ch', 0);

        gsap.killTweensOf(top);
        gsap.to(top, {
          scrambleText: { text: finalText, chars, revealDelay, tweenLength },
          ease,
          overwrite: 'auto',
          duration,
          onUpdate: () => {
            const shown = top.textContent || '';
            const f = finalText;
            let idx = 0;
            const n = Math.min(shown.length, f.length);
            while (idx < n && shown.charCodeAt(idx) === f.charCodeAt(idx)) idx++;
            t.wrap.style.setProperty('--cursor-index', idx);
            t.wrap.style.setProperty('--reveal-ch', idx);
          },
          onComplete: () => {
            top.classList.remove('dud');
            t.wrap.classList.remove('scrambling');
            if (t.type === 'html') t.wrap.parentElement.innerHTML = t.finalHtml;
          }
        });
      };
      if (stagger > 0) setTimeout(start, i * stagger);
      else start();
    });
  });

  function createScrambleNode(text) {
    const wrap = document.createElement('span');
    wrap.className = 'scramble-wrap';
    const dup = document.createElement('span');
    dup.className = 'text-duplicate';
    dup.textContent = text;
    const top = document.createElement('span');
    top.className = 'scramble-text dud';
    top.textContent = '';
    wrap.append(dup, top);
    return { wrap, dup, top };
  }

  function htmlToText(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }
}

function removeSysText(selector, options = {}) {
  const sel = typeof selector === 'string' ? (/[#.\[\s]/.test(selector) ? selector : `#${selector}`) : null;
  const container = typeof selector === 'string' ? document.querySelector(sel) : selector;
  if (!container) return;

  const chars = options.chars || '/><.\\][{}]!@#$^&*()_+=-~|*';
  const ease = options.ease || 'power2.inOut';
  const duration = options.duration || 1.2;
  const stagger = Math.max(0, Number(options.stagger || 0));

  const wraps = Array.from(container.querySelectorAll('.scramble-wrap')).map(w => ({ kind: 'wrap', wrap: w }));
  const bareScripts = Array.from(container.querySelectorAll('.ui__script'))
    .filter(s => !s.querySelector('.scramble-wrap'))
    .map(s => ({ kind: 'script', host: s }));

  const items = (options.reverse === false ? [...wraps, ...bareScripts] : [...wraps, ...bareScripts].reverse());

  items.forEach((item, i) => {
    if (item.kind === 'wrap') {
      const wrap = item.wrap;
      let top = wrap.querySelector('.scramble-text');
      if (!top) {
        top = document.createElement('span');
        top.className = 'scramble-text';
        wrap.appendChild(top);
      }
      const source = wrap.querySelector('.final-text') || wrap.querySelector('.text-duplicate');
      const fullText = source ? source.textContent : top.textContent || '';
      top.textContent = fullText;
      top.classList.add('dud');
      wrap.classList.add('scrambling');
      wrap.style.setProperty('--cursor-index', fullText.length);

      gsap.killTweensOf(top);
      gsap.to(top, {
        scrambleText: { text: '', chars, tweenLength: true, revealDelay: 0 },
        ease,
        duration,
        delay: i * stagger,
        overwrite: 'auto',
        onUpdate: () => {
          const n = (top.textContent || '').length;
          wrap.style.setProperty('--cursor-index', n);
        },
        onComplete: () => {
          const scriptHost = wrap.closest('.ui__script');
          if (scriptHost) { scriptHost.remove(); return; }
          const row = wrap.closest('.sys--text');
          wrap.remove();
          if (row && row.childElementCount === 0) row.remove();
        }
      });
    } else {
      const host = item.host;
      const original = host.textContent || '';
      host.innerHTML = '';
      const wrap = document.createElement('span');
      wrap.className = 'scramble-wrap';
      wrap.style.setProperty('--cursor-index', original.length);
      const top = document.createElement('span');
      top.className = 'scramble-text dud';
      top.textContent = original;
      wrap.classList.add('scrambling');
      wrap.appendChild(top);
      host.appendChild(wrap);

      gsap.to(top, {
        scrambleText: { text: '', chars, tweenLength: true, revealDelay: 0 },
        ease,
        duration,
        delay: i * stagger,
        overwrite: 'auto',
        onUpdate: () => {
          const n = (top.textContent || '').length;
          wrap.style.setProperty('--cursor-index', n);
        },
        onComplete: () => {
          host.remove();
        }
      });
    }
  });
}



const top_text = [
  { name: '//', text: '>>>' },
  { name: 'DB',  text: 'MAINFRAME CONNECTION ESTABLISHED' },
  { name: 'CPU', text: 'ATMOSPHERIC PROCESSORS NOMINAL' }
];

const middle = [
  { name: 'AI', text: 'SCANNING...' },
];
const bottom = [
  { name: '//', text: '>>>>' },
  { name: 'SYS', text: 'NEURAL NETWORK INITIALIZED' },
  { name: 'DB', text: 'MAINFRAME CONNECTION ESTABLISHED' },
  { name: 'DB', text: 'ATMOSPHERIC PROCESSORS NOMINAL' },
  { name: 'SYS', text: 'NEURO-LINK CALIBRATED' },
  { name: 'IX', text: 'FUSION CORE STABLE' },
  { name: 'IX', text: 'TEMPORAL ALIGNMENT SYNCHRONIZED' }
];

const topRight_1 = [
  { "name": "SIGNAL:", "text": "NORMAL"},
  { "name": "CODE:", "text": "*******" },
  { "name": "ENCRYPTION:", "text": "QUANTUM-PHASE"},
  { "name": "CLEARANCE:", "text": "LEVEL-1"},
  { "name": "ACCESS:", "text": "GRANTED"},
  { "name": "NODES:", "text": "SYNCRONIZED"},
  { "name": "BANDWIDTH:", "text": "ALLOCATED"}
]
const topRight_start = [
  { "name": "PROGRESS:","text": "0%",secondClass:"prog"}
]
const next_scene = [
    { name: '//', text: '>>>' },  
    { name: 'USR', text: 'Keep scrolling' }
]
const first_scene = [
    { name: '//', text: '>>>' },  
    { name: 'USR', text: 'Start scrolling' }
]
const top_1 = [
  { name: 'prg', text: '>>>' },
  { name: 'DB',  text: 'MAINFRAME CONNECTION ESTABLISHED' },
  { name: 'CPU', text: 'ATMOSPHERIC PROCESSORS NOMINAL' },
];


const scene1_1 = [
    { name: '//', text: 'TRANSCODING OUTPUT' },        
    { script: true, text: "I DON'T REMEMBER WHEN IT BEGAN." },
    { script: true, text: "ONLY THE LIGHT. AND THE COLD." },
    { script: true, text: "AS IF THE WORLD WAS CALLING ME AGAIN." },
    { name: '//', text: '>>>' },  
    { name: 'USR', text: 'Keep scrolling' }
]
const scene1_2 = [ 
    { name: '//', text: 'IDENTIFYING SUBJECT' },
    { name: '//', text: 'SUBJECT - SPARK' },
    { name: '//', text: 'CAPTURING NEURAL ACTIVITY',secondClass:"pulse" },    
    { name: '//', text: 'TRANSCODING OUTPUT' },        
    { script: true, text: "This place was once free." },
    { script: true, text: "People laughed in the streets," },
    { script: true, text: "and birds filled the skies." },
    { script: true, text: "DREAMS HAVE BECOME A DISTANT ECHO" },
    { script: true, text: "SILENCED BY THE OPPRESSORS OF OUR CITY." },
    { name: '//', text: '>>>' },  
    { name: 'USR', text: 'Keep scrolling' }
]
const scene1_3 = [ 
    { name: '//', text: 'IDENTIFYING SUBJECT' },
    { name: '//', text: 'SUBJECT - SPARK' },
    { name: '//', text: 'CAPTURING NEURAL ACTIVITY',secondClass:"pulse" },    
    { name: '//', text: 'TRANSCODING OUTPUT' },        
    { script: true, text: "They are searching for me..." },
    { script: true, text: "They fear what I could ignite" },
    { name: '//', text: '>>>' },  
    { name: 'USR', text: 'Keep scrolling' }
]
const scene2_1 = [ 
  // { name: '//', text: 'IDENTIFYING SUBJECT' },
  //   { name: '//', text: 'SUBJECT - SPARK' },
  //   { name: '//', text: 'CAPTURING NEURAL ACTIVITY',secondClass:"pulse" },  
  //   { name: '//', text: 'TRANSCODING OUTPUT' },        
    { script: true, text: "SURVEILLANCE TRACKS OUR EVERY THOUGHT." },
    { script: true, text: "WHERE WE ONCE SHARED IDEAS," },
    { script: true, text: "WE MUST NOW HIDE." },
    { script: true, text: "They are everywhere." },
    
    { name: '//', text: '>>>' },  
    { name: 'USR', text: 'Keep scrolling' }  
]
const scene3_1 = [
    // { name: '//', text: 'IDENTIFYING SUBJECT' },
    // { name: '//', text: 'SUBJECT - SPARK' },
    // { name: '//', text: 'CAPTURING NEURAL ACTIVITY',secondClass:"pulse" },    
    // { name: '//', text: 'TRANSCODING OUTPUT' },    
    { script: true, text: 'They found us!!!' },
    { script: true, text: 'I know how to outrun them...' },
    { script: true, text: 'follow me!' },
    { name: '//', text: '>>>' },
    { name: 'USR', text: 'Keep scrolling' }

]


const scene3_2 = [

    // { name: '//', text: 'IDENTIFYING SUBJECT' },
    // { name: '//', text: 'SUBJECT - SPARK' },
    // { name: '//', text: 'CAPTURING NEURAL ACTIVITY',secondClass:"pulse" },  
    // { name: '//', text: 'TRANSCODING OUTPUT' },        
    { script: true, text: 'Corridors race by.' },
    { script: true, text: 'Pipes and panels blur.' },    
    { script: true, text: 'Their red eyes...' },
    { script: true, text: 'scraping the walls behind us.' },
    { name: 'DIR', text: 'EAST' },
    { name: 'DRN', text: 'INCREASE PURSUIT' },
    { name: '//', text: '>>>' },
    { name: 'USR', text: 'Keep scrolling' }

]
const scene4_1 = [
    //   { name: '//', text: 'IDENTIFYING SUBJECT' },
    // { name: '//', text: 'SUBJECT - SPARK' },
    // { name: '//', text: 'TRANSCODING OUTPUT' },  
    // { name: '//', text: 'CAPTURING NEURAL ACTIVITY',secondClass:"pulse" },
    { script: true, text: 'MY WORLD WILL NOT BE RULED.' },
    { script: true, text: 'BY ENGINEERED CONFORMITY.' },
    { name: '//', text: '>>>' },
    { name: 'USR', text: 'Keep scrolling' }

]
const scene4_2 = [
    { name: '//', text: 'IDENTIFYING SUBJECT' },
    { name: '//', text: 'SUBJECT - SPARK' },
    { name: '//', text: 'CAPTURING NEURAL ACTIVITY',secondClass:"pulse" },
    { name: '//', text: 'TRANSCODING OUTPUT' },    
    { script: true, text: 'This will be our last stand' },    
    { name: 'SYS', text: 'TARGET LOCKED' },
    { name: '//', text: '>>>' },
    { name: 'USR', text: 'Keep scrolling' }

]
const scene1_top_1 = [
  { name: '//', text: '>>>' },
  { name: 'DB',  text: 'MAINFRAME CONNECTION LOST',secondClass:"error" },
  { name: 'CPU', text: 'ATMOSPHERIC PROCESSORS ABNORMAL',secondClass:"error" }
];
const scene6_1 = [
    { script: true, text: "I'm so glad I found you..." },    
    { script: true, text: "You brought light into my world." },
]
const scene6_2 = [
    { script: true, text: "I'm so glad you found me..." },    
    { script: true, text: "Without you, I would have been lost forever." },
]
// function start(){
//   $('.sys--text').fadeOut();

// }




// const observer=new MutationObserver(ms=>{
//   for(const r of ms){
//     const a=r.attributeName;
//     const v=document.body.getAttribute(a);
//     const k=(a==="data-scene"?"scene:":"progress:")+v;
//     if(actions[k]) actions[k]();
//   }
//   const s=document.body.getAttribute("data-scene");
//   const p=document.body.getAttribute("data-progress");
//   const combo=`scene:${s}&progress:${p}`;
//   if(actions[combo]) actions[combo]();
// });

// observer.observe(document.body,{attributes:true,attributeFilter:["data-scene","data-progress"]});


 function makeValueTriggers() {
  const prev = new Map();
  const watchers = new Map();
  function ensure(k){ if(!watchers.has(k)) watchers.set(k,new Set()); if(!prev.has(k)) prev.set(k,undefined); }
  function hit(w, a, b){
    const e = w.epsilon ?? 0;
    const up = a < w.target && b >= w.target - e;
    const down = a > w.target && b <= w.target + e;
    const eq = Math.abs(b - w.target) <= e;
    return w.dir === 'up' ? up : w.dir === 'down' ? down : eq;
  }
  return {
    on({ key, target, dir='up', epsilon=0, once=false, cooldown=0, cb }) {
      ensure(key);
      const w = { target, dir, epsilon, once, cooldown, cb, last: -Infinity };
      watchers.get(key).add(w);
      return () => watchers.get(key)?.delete(w);
    },
    update(key, v) {
      ensure(key);
      const a = prev.get(key);
      const now = performance.now();
      watchers.get(key).forEach(w => {
        if (a === undefined) return;
        if (hit(w, a, v) && now - w.last >= w.cooldown) {
          w.last = now;
          w.cb(v, a, w);
          if (w.once) watchers.get(key).delete(w);
        }
      });
      prev.set(key, v);
    },
    clear(key){ if(key){ watchers.get(key)?.clear(); prev.delete(key); } else { watchers.clear(); prev.clear(); } }
  };
}

  
function removeAllText(){
  removeSysText('#top-right', { duration: 1, stagger: 0 })
  removeSysText('#top-left--text', { duration: 1, stagger: 0 })
  removeSysText('#bottom-left', { duration: 1, stagger: 0 })
}



let scene;
let scrollProgress;
  // setup
const triggers = makeValueTriggers();


function hold({sel='.intro__cta',ms=1000,done=()=>{}}={}) {
  const el=document.querySelector(sel); if(!el) return; let t,s;
  const reset=()=>el.style.setProperty('--progress','0%');
  const down=e=>{ if(e.button!=null&&e.button!==0) return; s=performance.now(); el.setPointerCapture?.(e.pointerId);
    t?.kill(); t=gsap.to(el,{duration:ms/1000,'--progress':'100%',ease:'linear',onComplete:()=>{t=null; done({element:el,durationMs:performance.now()-s});}}); };
  const up=()=>{ if(t&&t.progress()<1){ t.kill(); reset(); t=null; } };
  el.addEventListener('pointerdown',down); ['pointerup','pointercancel','lostpointercapture'].forEach(x=>el.addEventListener(x,up));
  return{destroy(){ el.removeEventListener('pointerdown',down); ['pointerup','pointercancel','lostpointercapture'].forEach(x=>el.removeEventListener(x,up)); }};
}

function scrollWaypoints(waypoints, { scroller = document.querySelector('.scroll-container'), bidirectional = false } = {}) {
  const byScene = new Map();
  for (const w of waypoints) {
    const s = +w.scene, pct = +w.percent;
    if (!byScene.has(s)) byScene.set(s, []);
    byScene.get(s).push({ percent: pct, enter: w.enter, leaveBack: w.leaveBack });
  }
  for (const arr of byScene.values()) arr.sort((a, b) => a.percent - b.percent);

  const last = new Map();
  const eps = 0.0001;
  const safeRun = (fn) => {
    if (!fn) return;
    const fns = Array.isArray(fn) ? fn : [fn];
    for (const f of fns) { try { f && f(); } catch (e) { console.error('Waypoint callback error:', e); } }
  };

  if (!gsap.core.globals().ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  const st = ScrollTrigger.create({
    scroller,
    start: 0,
    end: 'max',
    onUpdate(self) {
      const scene = +CABLES.patch.getVarValue('current-scene');
      const p = +CABLES.patch.getVarValue('current-progress');
      $('.prog span').text(Math.round(self.progress * 100) + "%");
      const list = byScene.get(scene);
      if (!list) return;
      const prev = last.get(scene);
      last.set(scene, p);
      if (prev == null) return;
      const up = p > prev + eps;
      const down = p < prev - eps;
      for (let i = 0; i < list.length; i++) {
        const w = list[i], t = w.percent;
        if (up && prev < t && p >= t) safeRun(w.enter);
        else if (bidirectional && down && prev > t && p <= t) safeRun(w.leaveBack);
      }
    }
  });

  let raf = 0;
  const ro = new ResizeObserver(() => {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; ScrollTrigger.refresh(); });
  });

  if (scroller) {
    ro.observe(scroller);
    const kids = Array.from(scroller.children);
    for (const el of kids) ro.observe(el);
  }

  return st;
}
//intro screen
renderSysText('#intro--top-left',[{ name: 'SYS', text: 'DOWNLOADING DATA PACKAGE...' }],{wide:true,stagger:500,replace:true})

document.addEventListener('CABLES.jsLoaded', function (event) {
      CABLES.patch = new CABLES.Patch({
        patch: CABLES.exportedPatch,
        "prefixAssetPath": "",
        "assetPath": "",
        "jsPath": "",
        "glCanvasId": "glcanvas",
        "glCanvasResizeToWindow": true,
        "onPatchLoaded": patchInitialized,
        "onFinishedLoading": patchFinishedLoading,
        "canvas":{"alpha":true,"premultipliedAlpha":true} // make canvas transparent
    });


    hold({sel:'.intro__cta',ms:1000,done:({element,durationMs})=>startTheShow()});
    
      function startTheShow(){
              //start
              CABLES.patch.setVarValue('start',1);
              $('.intro').addClass('hide');
              renderSysText('#top-left--text', top_text, { wide: false, stagger: 500, replace:true  });
              renderSysText('#bottom-left', bottom, { wide: false, stagger: 500, replace:true  });
              renderSysText('#top-right', topRight_1, { wide: true, stagger: 500, replace:true  });
              renderSysText('#middle', middle, { wide: true, stagger: 0, replace:true });
          }          
      CABLES.patch.config.renderSysText = renderSysText;

            
            gsap.registerPlugin(ScrollTrigger);

            const sc = document.querySelector('.scroll-container');

            
    
            const container = document.body

            container.addEventListener('click', e => {
              const el = e.target.closest('.toggle')
              if (!el) return
              const varName = el.dataset.var || 'mute'
              const willBeOff = !el.classList.contains('off')
              const group = el.dataset.var
                ? container.querySelectorAll(`.toggle[data-var="${el.dataset.var}"]`)
                : [el]
              group.forEach(t => t.classList.toggle('off', willBeOff))
              CABLES.patch.setVarValue(varName, willBeOff ? 1 : 0)
            })
              scrollWaypoints([             
                { scene:0, percent:2, enter:()=>renderSysText('#bottom-left',[{ name: '//', text: 'IDENTIFYING SUBJECT' }],{wide:false,stagger:500,replace:true}) },
                { scene:0, percent:4, enter:()=>renderSysText('#bottom-left',[{ name: '//', text: 'SUBJECT - SPARK' }],{wide:false,stagger:500,replace:false}) },
                { scene:0, percent:6, enter:()=>renderSysText('#bottom-left',[{ name: '//', text: 'CAPTURING NEURAL ACTIVITY',secondClass:"pulse" }],{wide:false,stagger:500,replace:false}) },
                { scene:0, percent:10, enter:()=>renderSysText('#bottom-left',scene1_1,{wide:false,stagger:500,replace:false}) },
                { scene:0, percent:45, enter:()=>renderSysText('#bottom-left',scene1_2,{wide:false,stagger:0,replace:true}) },
                { scene:0, percent:80, enter:()=>renderSysText('#bottom-left',scene1_3,{wide:false,stagger:0,replace:true}) },
                { scene:0, percent:106, enter:()=>renderSysText('#top-left--text',scene1_top_1,{wide:false,stagger:100,replace:true}) },
                { scene:0, percent:105, enter:()=>removeSysText('#bottom-left', { duration: 1, stagger: 0 }) },
                { scene:0, percent:106, enter:()=>renderSysText('#bottom-left',next_scene,{wide:false,stagger:500,replace:true}) },
                { scene:1, percent:5, enter:()=>renderSysText('#bottom-left', scene2_1,{wide:false,stagger:0,replace:true}) },
                { scene:1, percent:80, enter:()=>removeSysText('#bottom-left', { duration: 1, stagger: 0 }) },
                { scene:2, percent:5, enter:()=>renderSysText('#bottom-left', scene3_1,{wide:false,stagger:0,replace:true}) },
                { scene:2, percent:35, enter:()=>renderSysText('#bottom-left', scene3_2,{wide:false,stagger:0,replace:true}) },                
                { scene:2, percent:85, enter:()=>removeSysText('#bottom-left', { duration: 1, stagger: 0 }) },                
                { scene:3, percent:5, enter:()=>renderSysText('#bottom-left', scene4_1,{wide:false,stagger:0,replace:true}) },
                { scene:3, percent:80, enter:()=>renderSysText('#bottom-left', scene4_2,{wide:false,stagger:0,replace:true}) },
                { scene:3, percent:95, enter:()=>removeSysText('#bottom-left', { duration: 1, stagger: 0 }) },
                { scene:4, percent:65, enter:()=>wfIx.emit("scene5-end") },
                { scene:5, percent:35, enter:()=>wfIx.emit("creativity-flowing")},
                 { scene:5, percent:30, enter:()=>wfIx.emit('end-convo')}
                // { scene:5, percent:95, enter:()=>wfIx.emit("final-text"), leaveBack:()=>wfIx.emit('final-text-back') }
              ],{ bidirectional:true })
       
          

        
          
        const currentScene = CABLES.patch.getVar("current-scene");
        scrollProgress = CABLES.patch.getVar("current-progress");
        if (scrollProgress){
          scrollProgress.on("change", (val) => {
            // console.log(val);
            if(scene == 5 && val > 130)
              {
                // wfIx.emit("final-text")
                // console.log('end the credits already');
              }
          })

        }
        if(currentScene) {
            // will be called every time value changes
            currentScene.on("change", (val) => {
              scene=val;
              renderSysText('#bottom-left', next_scene, { wide: false, stagger: 0, replace:true  });
              renderSysText('#top-right',topRight_start,{wide:true,stagger:0,replace:true});
              if(val == 4){
                $("#theme2-start").trigger("click")
                setTimeout(function(){wfIx.emit("scene5-start")},3500);
              }
              if(val == 5){
                wfIx.emit('start-convo');
              }
                
              if(val == 1)
                 wfIx.emit('final-text-back');
                //scene changes 
              // console.log(val)
              if(val == 4 || val == 5){
                $('.controls').addClass('organic');
              }else{
                $('.controls').removeClass('organic');
              }
            });
        }
           CABLES.patch.config.showFinalText = function(parameters) {
                wfIx.emit("final-text");
                $('.theme-2').addClass('complete');
            };
            CABLES.patch.config.hideFinalText = function(parameters) {
                wfIx.emit('final-text-back');
                $('.theme-2').removeClass('complete');

            };
             CABLES.patch.config.explosion = function(parameters) {
               //start
               removeSysText('#middle',{duration:1,stagger:0})
               removeSysText('#bottom-left',{duration:1,stagger:0})
               removeSysText('#top-right',{duration:1,stagger:0})
               setTimeout(()=>{renderSysText('#top-right',topRight_start,{wide:true,stagger:500,replace:true})},1000);
               setTimeout(()=>{renderSysText('#bottom-left',first_scene,{wide:true,stagger:500,replace:true})},1500);
            };
});

          

             


function patchInitialized(patch) {
  // You can now access the patch object (patch), register variable watchers and so on
            
}

function patchFinishedLoading(patch) {
  // The patch is ready now, all assets have been loaded

  $('.canvas').addClass('start');

  // console.log(patch)
           
}



