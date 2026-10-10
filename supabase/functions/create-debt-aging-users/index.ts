import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST,OPTIONS",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type"
};
const headers = { ...corsHeaders, "content-type": "application/json" };

function decodeClaims(token: string) {
  const part = token.split(".")[1] || "";
  const padded = part.replace(/-/g,"+").replace(/_/g,"/") + "=".repeat((4-part.length%4)%4);
  return JSON.parse(atob(padded));
}
function temporaryPassword() {
  const lower="abcdefghjkmnpqrstuvwxyz", upper="ABCDEFGHJKMNPQRSTUVWXYZ", digits="23456789", symbols="!@#$%*-_";
  const chars=lower+upper+digits+symbols;
  const bytes=crypto.getRandomValues(new Uint8Array(24));
  const out=[upper[bytes[0]%upper.length],lower[bytes[1]%lower.length],digits[bytes[2]%digits.length],symbols[bytes[3]%symbols.length]];
  for(let i=4;i<24;i++)out.push(chars[bytes[i]%chars.length]);
  for(let i=out.length-1;i>0;i--){const j=bytes[i%bytes.length]%(i+1);[out[i],out[j]]=[out[j],out[i]];}
  return out.join("");
}

Deno.serve(async (req: Request) => {
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:corsHeaders});
  if(req.method!=="POST")return new Response(JSON.stringify({error:"method not allowed"}),{status:405,headers});
  const bearer=req.headers.get("authorization")||"";
  const token=bearer.startsWith("Bearer ")?bearer.slice(7):"";
  if(!token)return new Response(JSON.stringify({error:"unauthorized"}),{status:401,headers});

  const url=Deno.env.get("SUPABASE_URL")!;
  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:userData,error:userError}=await admin.auth.getUser(token);
  if(userError||!userData.user)return new Response(JSON.stringify({error:"unauthorized"}),{status:401,headers});
  let claims:any={};try{claims=decodeClaims(token);}catch(_){}
  if(claims.aal!=="aal2")return new Response(JSON.stringify({error:"admin two-factor verification required"}),{status:403,headers});
  const {data:caller,error:callerError}=await admin.from("profiles").select("id,role,active").eq("id",userData.user.id).maybeSingle();
  if(callerError||!caller?.active||caller.role!=="admin")return new Response(JSON.stringify({error:"admin only"}),{status:403,headers});

  const targets=[
    {username:"accounts_ali",full_name:"حسابات علي",email:"accounts-ali@dana.local"},
    {username:"accounts_ahmed",full_name:"حسابات أحمد",email:"accounts-ahmed@dana.local"}
  ];
  const listed=await admin.auth.admin.listUsers({page:1,perPage:1000});
  if(listed.error)return new Response(JSON.stringify({error:"could not check existing accounts"}),{status:500,headers});
  const users:any[]=[];
  for(const target of targets){
    const existing=listed.data.users.find(u=>u.email?.toLowerCase()===target.email);
    if(existing){
      const {data:profile}=await admin.from("profiles").select("id,role").eq("id",existing.id).maybeSingle();
      if(profile?.role==="accounts")continue;
      return new Response(JSON.stringify({error:`login alias ${target.username} is already in use`}),{status:409,headers});
    }
    const password=temporaryPassword();
    const created=await admin.auth.admin.createUser({email:target.email,password,email_confirm:true});
    if(created.error||!created.data.user)return new Response(JSON.stringify({error:`could not create ${target.username}`}),{status:500,headers});
    const {error:profileError}=await admin.from("profiles").insert({id:created.data.user.id,username:target.username,full_name:target.full_name,role:"accounts",active:true,must_change_password:true});
    if(profileError){await admin.auth.admin.deleteUser(created.data.user.id);return new Response(JSON.stringify({error:`could not create profile for ${target.username}`}),{status:500,headers});}
    users.push({...target,password});
  }
  if(!users.length)return new Response(JSON.stringify({error:"both accounts already exist; no passwords were changed"}),{status:409,headers});
  return new Response(JSON.stringify({users}),{status:200,headers});
});
