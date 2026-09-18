export const communicationGuardJs = String.raw`
(function(){
  'use strict';

  var HIGH_RISK_CONTEXTS = new Set(['recruiter','hiring_manager','interviewer','network','negotiation','rejection_reply','status_check','employer']);
  function txt(v){return String(v==null?'':v)}
  function words(s){return txt(s).trim().split(/\s+/).filter(Boolean)}
  function matches(s,re){return (txt(s).match(re)||[]).length}
  function add(out,code,severity,label,detail){
    if(!out.some(function(x){return x.code===code})) out.push({code:code,severity:severity,label:label,detail:detail});
  }
  function analyze(message, opts){
    opts=opts||{};
    var s=txt(message).trim(), low=s.toLowerCase(), context=txt(opts.context||'general').toLowerCase();
    var career=HIGH_RISK_CONTEXTS.has(context);
    var findings=[];

    if(/\b(i (probably|may have|might have|could have) (came|went|seemed|looked|sounded|been)|i was (too |a little )?(nervous|braced|off|awkward)|i hope i didn'?t|sorry if i|if i came across|i know i (talked|went|focused) too much)\b/i.test(s))
      add(findings,'self_narration','high','Do not narrate perceived mistakes','The recipient does not need your post-mortem unless a concrete factual error must be corrected.');

    if(/\b(how did i do|where do i stand|am i still (being considered|in the running)|do you think (i|we)|any feedback (for|on) me|was (ben|the team|he|she|they) happy with|did i (do|come across))\b/i.test(s))
      add(findings,'reassurance','high','Reassurance-seeking','Ask for a concrete next step only when needed; do not ask the recipient to regulate uncertainty.');

    if(/\b(i (really |desperately )?need (this|the) (job|role|opportunity)|i'?m (desperate|unemployed|out of work)|between jobs|need (insurance|benefits|income|a paycheck)|financial(ly)? (need|struggl)|my family needs)\b/i.test(s))
      add(findings,'personal_need',career?'high':'medium','Personal need disclosure','For career-facing messages, keep the case centered on value, fit, facts, and timing rather than personal need.');

    if(/\b(follow (him|her|you) anywhere|dream (job|company|role)|once[- ]in[- ]a[- ]lifetime|would mean the world|honou?r(ed)? just to|privilege just to|incredible leader|absolutely amazing)\b/i.test(s))
      add(findings,'adulation','medium','Over-praise / deference','Specific respect is useful; adulation can reduce peer-level positioning.');

    var excitement=matches(low,/\b(excited|thrilled|honored|grateful|amazing|incredible|love|dream)\b/g);
    if(career && excitement>=4) add(findings,'enthusiasm_density','medium','Enthusiasm is doing too much work','Keep one clear statement of interest and let specific fit/value carry the message.');

    var interest=matches(low,/\b(excited|interested|enthusiastic|looking forward|very interested|strong interest)\b/g);
    if(career && interest>=3) add(findings,'repeated_interest','medium','Repeated statements of interest','State continued interest once; repetition can read as pressure or insecurity.');

    var please=matches(low,/\bplease\b/g), thanks=matches(low,/\b(thank you|thanks|appreciate|grateful)\b/g);
    if(career && please>=3) add(findings,'please_density','medium','Too many asks softened with “please”','Use direct, courteous requests instead of repeated deference.');
    if(career && thanks>=4) add(findings,'gratitude_density','medium','Excessive gratitude','One sincere thank-you is enough for most recruiting messages.');

    if(career && /\b(just checking|checking in again|following up again|sorry to follow up|hate to bother|don'?t want to bother|i know you'?re busy|haven'?t heard|still waiting|any update yet)\b/i.test(s))
      add(findings,'followup_pressure','medium','Follow-up pressure / apology','Use a neutral timing-based follow-up without apologizing for existing.');

    if(career && /\b(i can do anything|whatever you need|any salary|salary is flexible|i'?ll take|i can start immediately no matter|i'?m open to anything)\b/i.test(s))
      add(findings,'leverage_giveaway','high','Unnecessary leverage giveaway','Do not volunteer away scope, compensation, or negotiating leverage unless it solves a concrete constraint.');

    if(career && /\b(i wanted to explain|to clarify what i meant|what i was trying to say|i may not have explained|i should have said|what i meant in the interview)\b/i.test(s))
      add(findings,'posthoc_explanation','medium','Post-hoc explanation','Clarify only a material factual point. Avoid replaying the interview in email.');

    var exclaims=matches(s,/!/g);
    if(career && exclaims>=4) add(findings,'exclamation_density','low','High exclamation density','Reduce punctuation intensity; confidence usually reads cleaner with fewer exclamation marks.');

    var wc=words(s).length;
    if(career && wc>260) add(findings,'length','medium','Message is long for a career follow-up','Cut to the specific connection, value/fit point, required action, and close.');
    else if(career && wc>180) add(findings,'length','low','Consider executive brevity','The message may benefit from tightening before send.');

    var highs=findings.filter(function(x){return x.severity==='high'}).length;
    var meds=findings.filter(function(x){return x.severity==='medium'}).length;
    var lows=findings.filter(function(x){return x.severity==='low'}).length;
    var score=Math.max(0,100-highs*28-meds*12-lows*4);
    var state=highs?'HOLD':meds>=2?'REVISE':meds||lows?'REVIEW':'READY';
    return {
      version:1,
      context:context,
      career_facing:career,
      score:score,
      state:state,
      ready:state==='READY',
      findings:findings,
      principles:[
        'Do not narrate perceived interview mistakes unless correcting a material fact.',
        'Do not over-praise or lower peer-level positioning.',
        'Do not seek reassurance about how you performed.',
        'Do not disclose personal need when value, fit, and timing are the relevant facts.',
        'State interest once; avoid repeated excitement or pressure.',
        'Prefer executive brevity: specific connection, value/fit, required action, close.'
      ]
    };
  }

  function format(result){
    if(!result) return '';
    var lead='Communication Guard: '+result.state+' · '+result.score+'/100';
    if(!result.findings.length) return lead+' · no desperation/self-undermining patterns detected.';
    return lead+' · '+result.findings.map(function(x){return x.label}).join('; ');
  }

  window.LandThePlaneCommunicationGuard={
    analyze:analyze,
    format:format,
    contexts:['general','recruiter','hiring_manager','interviewer','network','negotiation','rejection_reply','status_check','employer']
  };
})();
`;
