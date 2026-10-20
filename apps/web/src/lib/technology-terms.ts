const groups = {
  navigation:
    "home,overview,dashboard,menu,navigation,sidebar,header,footer,breadcrumb,tab,page,section,workspace,library,collection,category,filter,search,result,shortcut",
  accounts:
    "account,profile,user,member,role,permission,administrator,contributor,reviewer,editor,session,password,username,email,authentication,authorization,sign-in,sign-out,registration,recovery",
  content:
    "article,title,summary,body,paragraph,heading,word,noun,verb,grammar,vocabulary,translation,dialect,definition,example,source,citation,attribution,license,provenance",
  workflows:
    "draft,submission,review,approval,rejection,correction,revision,publication,dispute,evidence,comment,feedback,notification,alert,status,history,activity,assignment,application,release",
  data: "data,dataset,record,field,value,identifier,schema,table,row,column,database,query,index,export,import,download,upload,file,folder,archive,backup",
  development:
    "application,software,website,browser,server,client,API,endpoint,request,response,JSON,JSONL,code,function,variable,parameter,argument,package,dependency,version",
  interface:
    "button,link,icon,label,input,form,checkbox,toggle,dropdown,dialog,tooltip,placeholder,selection,focus,cursor,layout,spacing,contrast,accessibility,language",
  operations:
    "network,connection,timeout,error,warning,validation,configuration,environment,deployment,hosting,domain,certificate,encryption,token,cookie,cache,storage,log,monitoring,maintenance",
  browsing:
    "address bar,bookmark,browsing history,private browsing,search engine,search suggestion,web address,homepage,web page,hyperlink,redirect,refresh,reload,back button,forward button,new tab,tab group,reading list,download manager,pop-up",
  actions:
    "save,save as,open,close,cancel,confirm,continue,submit,send,receive,create,delete,remove,restore,undo,redo,copy,paste,cut,select all",
  editing:
    "text editor,rich text,plain text,bold,italic,underline,strikethrough,font,font size,line height,alignment,indentation,bullet list,numbered list,block quote,code block,find and replace,spell check,word count,autosave",
  documents:
    "document,spreadsheet,presentation,slide,worksheet,workbook,cell,formula,chart,pivot table,page break,page number,table of contents,footnote,endnote,caption,watermark,document template,track changes,document comparison",
  files:
    "filename,file extension,file size,file type,file path,root directory,subfolder,working directory,temporary file,hidden file,read-only file,compressed file,attachment,preview,thumbnail,metadata,symbolic link,checksum,duplicate file,recycle bin",
  hardware:
    "computer,laptop,desktop computer,tablet,smartphone,workstation,motherboard,processor,CPU,GPU,RAM,hard drive,solid-state drive,power supply,cooling fan,heat sink,expansion slot,circuit board,chipset,transistor",
  peripherals:
    "keyboard,mouse,touchpad,trackball,monitor,screen,printer,scanner,webcam,microphone,speaker,headphones,headset,projector,stylus,graphics tablet,USB hub,docking station,card reader,external drive",
  displays:
    "pixel,resolution,refresh rate,aspect ratio,brightness,color depth,color profile,touchscreen,multi-touch,screen orientation,portrait mode,landscape mode,full screen,split screen,screen capture,screen recording,display scaling,viewing angle,dead pixel,screen reader",
  mobile:
    "mobile app,app store,home screen,lock screen,status bar,notification shade,airplane mode,mobile data,roaming,hotspot,SIM card,eSIM,contact list,call log,voicemail,text message,push notification,biometric unlock,gesture navigation,battery saver",
  operating_systems:
    "operating system,kernel,boot,shutdown,restart,sleep mode,hibernate,task manager,system settings,control panel,device driver,firmware,system update,system restore,process,thread,service,daemon,system tray,desktop environment",
  connectivity:
    "Wi-Fi,Ethernet,Bluetooth,NFC,USB,HDMI,DisplayPort,Thunderbolt,adapter,connector,cable,port,router,switch,modem,access point,repeater,bridge,gateway,network interface",
  networking:
    "IP address,MAC address,subnet,subnet mask,default gateway,DNS,DHCP,TCP,UDP,HTTP,HTTPS,FTP,SSH,VPN,LAN,WAN,bandwidth,latency,packet,protocol",
  network_operations:
    "routing,firewall,proxy,reverse proxy,load balancer,port forwarding,network topology,packet loss,jitter,throughput,network congestion,quality of service,ping,traceroute,name resolution,IP allocation,network segment,virtual network,tunnel,peering",
  web_foundations:
    "HTML,CSS,JavaScript,DOM,URL,URI,web standard,semantic markup,element,attribute,tag,stylesheet,selector,pseudo-class,pseudo-element,media query,viewport,document tree,event listener,web component",
  web_delivery:
    "web server,static site,dynamic site,single-page application,server-side rendering,client-side rendering,static generation,hydration,content delivery network,web socket,service worker,progressive web app,web manifest,offline mode,web crawler,sitemap,robots file,canonical URL,search ranking,structured data",
  programming:
    "program,algorithm,syntax,expression,statement,operator,operand,constant,literal,data type,string,integer,float,boolean,array,object,class,method,property,constructor",
  control_flow:
    "condition,conditional branch,loop,iteration,recursion,return value,scope,closure,callback,promise,async function,exception,exception handler,stack trace,breakpoint,debugger,call stack,execution context,type conversion,type inference",
  software_design:
    "module,namespace,interface contract,abstract class,inheritance,composition,encapsulation,polymorphism,generic type,enumeration,design pattern,dependency injection,separation of concerns,coupling,cohesion,immutability,pure function,side effect,state machine,event bus",
  source_control:
    "repository,commit,branch,merge,rebase,pull request,code review,diff,patch,clone,fork,remote,staging area,merge conflict,commit message,tagged release,revision control,change log,gitignore,blame view",
  testing:
    "unit test,integration test,end-to-end test,regression test,smoke test,acceptance test,test case,test suite,test fixture,mock,stub,assertion,coverage,test runner,snapshot test,load test,stress test,accessibility test,manual test,flaky test",
  build_tools:
    "compiler,interpreter,transpiler,bundler,minifier,linter,formatter,build artifact,build pipeline,continuous integration,continuous delivery,package manager,lockfile,semantic versioning,release candidate,nightly build,debug build,production build,source map,tree shaking",
  api_design:
    "REST,GraphQL,RPC,webhook,request header,response header,request body,response body,status code,query parameter,path parameter,pagination,rate limit,API key,bearer token,idempotency,content negotiation,API versioning,OpenAPI,SDK",
  databases:
    "relational database,document database,key-value store,graph database,time-series database,primary key,foreign key,unique constraint,not-null constraint,check constraint,transaction,rollback,commit transaction,join,view,stored procedure,trigger,migration,replication,sharding",
  data_management:
    "normalization,denormalization,referential integrity,query plan,query optimizer,database connection,connection pool,read replica,write lock,deadlock,isolation level,atomicity,durability,consistency,eventual consistency,upsert,bulk insert,soft delete,data retention,data lineage",
  data_formats:
    "CSV,TSV,XML,YAML,TOML,Markdown,PDF,ZIP,TAR,GZIP,UTF-8,Unicode,ASCII,Base64,binary format,serialization,deserialization,delimiter,escape character,byte order mark",
  analytics:
    "metric,dimension,aggregation,average,median,percentile,distribution,correlation,outlier,sample,population,histogram,scatter plot,line chart,bar chart,pie chart,heatmap,time series,trend,forecast",
  artificial_intelligence:
    "artificial intelligence,machine learning,deep learning,neural network,language model,training,inference,training data,validation data,test data,embedding,vector,tokenization,prompt,context window,fine-tuning,retrieval-augmented generation,hallucination,model evaluation,model checkpoint",
  language_technology:
    "corpus,lexicon,lemma,stemming,lemmatization,part of speech,morphology,phoneme,grapheme,transliteration,transcription,speech recognition,speech synthesis,machine translation,language detection,sentiment analysis,named entity,word segmentation,parallel corpus,terminology management",
  security:
    "cybersecurity,threat,vulnerability,exploit,malware,virus,ransomware,spyware,phishing,social engineering,brute-force attack,denial of service,SQL injection,cross-site scripting,cross-site request forgery,penetration test,security audit,attack surface,threat model,security patch",
  identity:
    "multi-factor authentication,two-factor authentication,one-time password,passkey,password manager,password hash,salt,single sign-on,identity provider,OAuth,OpenID Connect,SAML,access token,refresh token,session expiry,account lockout,account verification,password reset,security question,recovery code",
  privacy:
    "personal data,sensitive data,consent,data subject,data controller,data processor,privacy policy,cookie consent,anonymization,pseudonymization,data minimization,right to erasure,data portability,access request,retention period,privacy notice,tracking pixel,third-party cookie,fingerprint tracking,privacy setting",
  cryptography:
    "plaintext,ciphertext,cipher,hash,digital signature,public key,private key,key pair,key exchange,certificate authority,certificate chain,TLS,end-to-end encryption,encryption at rest,encryption in transit,key rotation,key derivation,secure random number,cryptographic nonce,message authentication code",
  cloud:
    "cloud computing,virtual machine,container,container image,container registry,orchestration,cluster,node,pod,serverless function,object storage,block storage,file storage,cloud region,availability zone,infrastructure as code,resource provisioning,autoscaling,elasticity,multi-tenancy",
  reliability:
    "uptime,downtime,availability,reliability,service level agreement,service level objective,service level indicator,incident,outage,root cause,postmortem,disaster recovery,recovery point objective,recovery time objective,failover,redundancy,health check,heartbeat,circuit breaker,retry policy",
  observability:
    "observability,telemetry,log level,log rotation,audit log,error log,access log,distributed tracing,trace identifier,span,performance profile,memory leak,CPU usage,memory usage,disk usage,resource limit,alert threshold,on-call rotation,incident response,runbook",
  interface_design:
    "wireframe,mockup,prototype,design system,design token,component,component variant,grid,gutter,padding,margin,border,border radius,shadow,opacity,z-index,overflow,flexbox,responsive design,breakpoint layout",
  interaction:
    "hover,active state,disabled state,loading state,empty state,error state,success state,progress bar,spinner,skeleton loader,toast,snackbar,accordion,carousel,stepper,segmented control,radio button,range slider,date picker,color picker",
  accessibility:
    "accessible name,alternative text,ARIA landmark,focus indicator,focus order,keyboard navigation,skip link,live region,color contrast,reduced motion,high contrast mode,zoom,text scaling,closed caption,audio description,assistive technology,switch control,voice control,accessible form,accessibility tree",
  collaboration:
    "team,organization,invitation,mention,direct message,channel,discussion,conversation,meeting,video call,audio call,screen sharing,whiteboard,shared document,presence indicator,typing indicator,read receipt,collaborator,ownership transfer,approval request",
  commerce:
    "shopping cart,checkout,order,invoice,receipt,payment,payment gateway,billing address,shipping address,subscription,free trial,refund,discount,coupon,tax,currency,exchange rate,transaction fee,payment method,renewal",
  media:
    "image,photo,video,audio,animation,frame,frame rate,bitrate,codec,compression,lossless compression,lossy compression,raster image,vector image,image crop,image resize,transparency,subtitle,playlist,streaming",
  support:
    "help center,knowledge base,frequently asked questions,support ticket,bug report,feature request,issue tracker,issue priority,issue severity,reproduction steps,expected behavior,actual behavior,workaround,hotfix,known issue,troubleshooting,diagnostic report,contact support,service status,user guide",
} as const;

const seenEnglish = new Set<string>();
export const technologyTerms = Object.entries(groups).flatMap(([category, words]) =>
  words
    .split(",")
    .filter((english) => {
      const key = english.toLowerCase();
      if (seenEnglish.has(key)) return false;
      seenEnglish.add(key);
      return true;
    })
    .map((english) => ({
      id: `tech-${category}-${english.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      english,
      somali: null as string | null,
      category,
      review_status: "needs_translation" as const,
      source: "qaamuusAi technology terminology planning list",
      license: "CC0-1.0",
    })),
);

export const technologyMetadata = {
  version: "0.2.0-draft",
  status: "planning",
  target_terms: 1000,
  translation_status:
    "No Somali translations have been supplied or verified in this planning list.",
  license: "CC0-1.0",
};
