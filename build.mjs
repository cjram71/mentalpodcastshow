import {cp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';

const output='dist';
await rm(output,{recursive:true,force:true});
await mkdir(`${output}/assets`,{recursive:true});

for(const file of ['404.html','CNAME','.nojekyll']){
  await cp(file,`${output}/${file}`);
}
await cp('assets',`${output}/assets`,{recursive:true});

let html=await readFile('index.html','utf8');

const oldForm=/<form class="submit-form" id="submit-form">[\s\S]*?<\/form><p class="status" id="status" aria-live="polite"><\/p>/;
const newForm=`<form class="submit-form" id="submit-form" action="https://formspree.io/f/xzdngkpe" method="POST" novalidate><input type="hidden" name="_subject" value="New Mental Podcast Show submission"><input type="hidden" name="source" value="mentalpodcastshow.com submission form"><label>Podcast or proposed topic<input id="pod-name" name="podcast_or_topic" required autocomplete="organization-title"></label><label>Your name<input id="your-name" name="name" required autocomplete="name"></label><label class="full">Official website or RSS feed<input id="pod-url" name="official_source" type="url" placeholder="https://" autocomplete="url"></label><label>Email<input id="your-email" name="email" type="email" required autocomplete="email"></label><label>Relationship<select id="relationship" name="relationship" required><option>Host or producer</option><option>Publisher or network</option><option>Listener recommendation</option><option>Guest application</option><option>Correction</option><option>Partnership idea</option></select></label><label class="full">Details<textarea id="message" name="details" rows="6" required placeholder="Tell us about the podcast, guest or topic. Include format, perspective, language, country and important content warnings."></textarea></label><label class="full check"><span><input name="submission_confirmed" type="checkbox" value="Yes" required> I confirm that the information is accurate and understand that submission does not guarantee publication.</span></label><label class="full check"><span><input name="privacy_consent" type="checkbox" value="Yes" required> I agree that Mental Podcast Show may use this information to review and respond to my submission.</span></label><p class="full form-note">This form is for podcast, guest, correction and partnership proposals. Do not include confidential medical information or use it for crisis support.</p><button id="submission-button" type="submit">Send submission</button></form><p class="status" id="status" role="status" aria-live="polite"></p>`;

if(!oldForm.test(html)) throw new Error('Submission form markup was not found.');
html=html.replace(oldForm,newForm);

const oldHandler=/\$\('#submit-form'\)\.addEventListener\('submit',e=>\{.*?\}\);render\(\);/;
const newHandler=`const submissionForm=$('#submit-form'),submissionStatus=$('#status'),submissionButton=$('#submission-button');submissionForm.addEventListener('submit',async e=>{e.preventDefault();submissionStatus.className='status';if(!submissionForm.checkValidity()){submissionForm.reportValidity();submissionStatus.textContent='Please complete the required fields.';submissionStatus.classList.add('error');return;}submissionButton.disabled=true;submissionButton.textContent='Sending…';submissionStatus.textContent='Sending your submission securely…';try{const response=await fetch(submissionForm.action,{method:'POST',body:new FormData(submissionForm),headers:{Accept:'application/json'}});if(response.ok){submissionForm.reset();submissionStatus.textContent='Thank you. Your submission has been received.';submissionStatus.classList.add('success');}else{const result=await response.json().catch(()=>({}));const detail=Array.isArray(result.errors)?result.errors.map(item=>item.message).join(' '):'';throw new Error(detail||'The form could not be sent. Please try again.');}}catch(error){submissionStatus.textContent=error.message||'The form could not be sent. Please try again.';submissionStatus.classList.add('error');}finally{submissionButton.disabled=false;submissionButton.textContent='Send submission';}});render();`;

if(!oldHandler.test(html)) throw new Error('Old mailto submission handler was not found.');
html=html.replace(oldHandler,newHandler);

const formStyles=`.submit-form .check{display:block;font-weight:650;color:#c1baba}.submit-form .check input{width:auto;margin-right:8px}.submit-form button:disabled{opacity:.65;cursor:wait}.form-note{margin:0;color:#9f9696;font-size:.78rem}.status.success{color:#54b978}.status.error{color:#ef6a64}`;
html=html.replace('</style>',`${formStyles}</style>`);
html=html.replace('If you email a submission, the information is used to review and respond to that request.','If you use the submission form, the information is processed by Formspree and delivered to Mental Podcast Show so it can be reviewed and answered. Do not include confidential medical information.');

await writeFile(`${output}/index.html`,html,'utf8');
console.log('Built static site in dist with direct Formspree submission.');
