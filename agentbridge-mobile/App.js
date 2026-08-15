import React, {useEffect, useMemo, useState} from "react";
import {SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert} from "react-native";
import * as SecureStore from "expo-secure-store";
import * as DocumentPicker from "expo-document-picker";
import {StatusBar} from "expo-status-bar";

const CLOUD="https://agentbridge.clintware.com";
const KEY="agentbridge-alpha-token";
async function call(token,path,opt={}){
  const headers={...(opt.headers||{})}; if(token)headers.authorization=`Bearer ${token}`;
  if(opt.body&&typeof opt.body!=="string"){headers["content-type"]="application/json";opt.body=JSON.stringify(opt.body)}
  const r=await fetch(CLOUD+path,{...opt,headers}); const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j.error||j.message||`HTTP ${r.status}`); return j;
}
const Button=({children,onPress,secondary})=><TouchableOpacity style={[s.button,secondary&&s.secondary]} onPress={onPress}><Text style={s.buttonText}>{children}</Text></TouchableOpacity>;
export default function App(){
  const [token,setToken]=useState(""); const [state,setState]=useState({devices:[],jobs:[],schedules:[],metrics:{}}); const [code,setCode]=useState(""); const [device,setDevice]=useState(""); const [pack,setPack]=useState("");
  const refresh=async(t=token)=>{if(!t)return;const x=await call(t,"/api/state");setState(x);if(!device&&x.devices[0])setDevice(x.devices[0].device_id)};
  useEffect(()=>{SecureStore.getItemAsync(KEY).then(async t=>{if(t){setToken(t);try{await refresh(t)}catch{}}})},[]);
  const bootstrap=async()=>{const x=await call("","/api/account/bootstrap",{method:"POST",body:{}});await SecureStore.setItemAsync(KEY,x.account_token);setToken(x.account_token);await refresh(x.account_token)};
  const pair=async()=>{try{await call(token,"/api/pair/claim",{method:"POST",body:{pair_code:code.trim().toUpperCase()}});setCode("");await refresh()}catch(e){Alert.alert("Pairing failed",e.message)}};
  const choose=async()=>{const r=await DocumentPicker.getDocumentAsync({copyToCacheDirectory:true});if(r.canceled)return;const a=r.assets[0];const text=await (await fetch(a.uri)).text();setPack(text)};
  const send=async()=>{if(!device||!pack.trim())return Alert.alert("Missing task","Choose a device and paste/import an AgentBridge Markdown or JSON pack.");try{await call(token,"/api/jobs",{method:"POST",body:{device_id:device,pack_name:"mobile-task.md",pack_text:pack,title:"Mobile AgentBridge task"}});setPack("");await refresh()}catch(e){Alert.alert("Send failed",e.message)}};
  const approve=async(id)=>{try{await call(token,`/api/jobs/${id}/approve`,{method:"POST",body:{}});await refresh()}catch(e){Alert.alert("Approval failed",e.message)}};
  const calm=useMemo(()=>state.jobs.some(j=>j.status==="approval_required"||j.status==="failed")?"Something needs you.":"All systems relaxed.",[state]);
  if(!token)return <SafeAreaView style={s.root}><StatusBar style="light"/><View style={s.center}><Text style={s.brand}>AGENTBRIDGE</Text><Text style={s.h1}>Your AI plans. Your machines execute.</Text><Text style={s.muted}>Create an alpha account key to control paired Windows, macOS, and Linux Nodes.</Text><Button onPress={bootstrap}>Create alpha account</Button></View></SafeAreaView>;
  return <SafeAreaView style={s.root}><StatusBar style="light"/><ScrollView contentContainerStyle={s.wrap}>
    <Text style={s.brand}>CLINTWARE / AGENTBRIDGE</Text><Text style={s.h1}>{calm}</Text><Text style={s.muted}>{state.devices.length} device(s) · {state.metrics?.runs||0} completed run(s)</Text>
    <View style={s.card}><Text style={s.h2}>Pair a Node</Text><TextInput value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="PAIR CODE" placeholderTextColor="#708198" style={s.input}/><Button onPress={pair}>Pair device</Button></View>
    <View style={s.card}><Text style={s.h2}>Target device</Text>{state.devices.map(d=><TouchableOpacity key={d.device_id} style={[s.device,device===d.device_id&&s.selected]} onPress={()=>setDevice(d.device_id)}><Text style={s.strong}>{d.device_name||d.device_id}</Text><Text style={s.muted}>{d.platform}</Text></TouchableOpacity>)}</View>
    <View style={s.card}><Text style={s.h2}>Send an Execution Pack</Text><Button secondary onPress={choose}>Import .md / .json</Button><TextInput value={pack} onChangeText={setPack} placeholder="Or paste an AgentBridge pack" placeholderTextColor="#708198" multiline style={[s.input,s.textarea]}/><Button onPress={send}>Send to device</Button></View>
    <View style={s.card}><Text style={s.h2}>Recent runs</Text>{state.jobs.slice(0,12).map(j=><View key={j.id} style={s.job}><Text style={s.strong}>{j.title||j.pack_name||j.id}</Text><Text style={s.muted}>{j.status} · {j.device_id}</Text>{j.status==="approval_required"&&<Button onPress={()=>approve(j.id)}>Approve this job</Button>}{j.result?.planner_feedback&&<Text numberOfLines={7} style={s.result}>{j.result.planner_feedback}</Text>}</View>)}</View>
    <Button secondary onPress={()=>refresh()}>Refresh</Button>
  </ScrollView></SafeAreaView>
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:"#070a0f"},wrap:{padding:20,gap:16},center:{flex:1,justifyContent:"center",padding:24,gap:18},brand:{color:"#55e7ff",fontSize:12,fontWeight:"900",letterSpacing:2},h1:{color:"#f5f8fc",fontSize:34,fontWeight:"800",lineHeight:39},h2:{color:"#f5f8fc",fontSize:19,fontWeight:"800"},strong:{color:"#eef6ff",fontWeight:"800"},muted:{color:"#94a6ba",lineHeight:21},card:{backgroundColor:"#0d121a",borderColor:"#222d3a",borderWidth:1,borderRadius:16,padding:16,gap:12},input:{backgroundColor:"#070b10",borderColor:"#2a3745",borderWidth:1,borderRadius:11,padding:12,color:"#f5f8fc"},textarea:{minHeight:150,textAlignVertical:"top"},button:{backgroundColor:"#30cbe8",padding:12,borderRadius:11,alignItems:"center"},secondary:{backgroundColor:"#182331",borderWidth:1,borderColor:"#2c4052"},buttonText:{color:"#f8fdff",fontWeight:"800"},device:{padding:12,borderRadius:10,borderWidth:1,borderColor:"#25303c"},selected:{borderColor:"#55e7ff",backgroundColor:"#0a2028"},job:{paddingVertical:11,borderBottomColor:"#1c2630",borderBottomWidth:1,gap:6},result:{color:"#bbd0e2",fontFamily:"monospace",fontSize:11,backgroundColor:"#06090d",padding:9,borderRadius:8}});
