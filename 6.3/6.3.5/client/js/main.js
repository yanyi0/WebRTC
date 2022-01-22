'use strict';

// join 主动加入房间
// leave 主动离开房间
// new-peer 有人加入房间，通知已经在房间的人
// peer-leave 有人离开房间，通知已经在房间的人
// offer 发送offer给对端peer
// answer发送offer给对端peer
// candidate 发送candidate给对端peer
const SIGNAL_TYPE_JOIN = "join";
const SIGNAL_TYPE_RESP_JOIN = "resp-join";  // 告知加入者对方是谁
const SIGNAL_TYPE_LEAVE = "leave";
const SIGNAL_TYPE_NEW_PEER = "new-peer";
const SIGNAL_TYPE_PEER_LEAVE = "peer-leave";
const SIGNAL_TYPE_OFFER = "offer";
const SIGNAL_TYPE_ANSWER = "answer";
const SIGNAL_TYPE_CANDIDATE = "candidate";

var localUserId = Math.random().toString(36).substr(2);//本地uid
var remoteUserId = -1;//对端uid
var roomId = 0;

var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');
var localStream  = null;

var fishRTCEngine;
var FishRTCEngine = function(wsUrl){
    this.init(wsUrl);
    fishRTCEngine = this;
    return this;
}

FishRTCEngine.prototype.init = function(wsUrl){
    //设置wbsocket url
    this.wsUrl = wsUrl;
    //websocket对象
    this.signaling = null;
}

FishRTCEngine.prototype.createWebSocket = function(){
    fishRTCEngine = this;
    fishRTCEngine.signaling = new WebSocket(this.wsUrl);
    fishRTCEngine.signaling.onopen = function(){
        fishRTCEngine.onOpen();
    }

    fishRTCEngine.signaling.onmessage = function(ev){
        fishRTCEngine.onMessage(ev);
    }

    fishRTCEngine.signaling.onerror = function(ev){
        fishRTCEngine.onError(ev);
    }

    fishRTCEngine.signaling.onclose = function(ev){
        fishRTCEngine.onClose(ev);
    }
}

FishRTCEngine.prototype.onOpen = function(){
    console.log('websocket open');
}

FishRTCEngine.prototype.onMessage = function(event){
    console.log('websocket onMessage:'+event.data);

    var jsonMsg = JSON.parse(event.data);
    switch(jsonMsg.cmd){
       case SIGNAL_TYPE_NEW_PEER:
           handleRemoteNewPeer(jsonMsg);
           break;
       case SIGNAL_TYPE_RESP_JOIN:
           handleRespJoin(jsonMsg);
           break;
       case SIGNAL_TYPE_PEER_LEAVE:
           handleRemotePeerLeave(jsonMsg);
           break;
    }
}
//新人加入房间保存userId
function handleRemoteNewPeer(message){
    console.info("handleRemoteNewPeer, remoteUid: " + message.remoteUid);
    remoteUserId = message.remoteUid;
    //doOffer()
}
function handleRespJoin(message){
    console.info("handleRespJoin, remoteUid: " + message.remoteUid);
    remoteUserId = message.remoteUid;
    //doOffer();
}
function handleRemotePeerLeave(message){
    console.info("handleRespJoin, remoteUid: " + message.remoteUid);
    remoteVideo.srcObject = null;//远程对象置空
}

FishRTCEngine.prototype.onError = function(event){
    console.log('websocket onError' + event.data);
}

FishRTCEngine.prototype.onClose = function(event){
    console.log('websocket onClose code:' + event.code + ',reason:'+ EventTarget.reason);
}

FishRTCEngine.prototype.sendMessage = function(message){
    this.signaling.send(message);
}

function doJoin(roomId){
    var jsonMsg = {
       'cmd':'join',
       'roomId':roomId,
       'uid':localUserId,
    };
    var message = JSON.stringify(jsonMsg);
    fishRTCEngine.sendMessage(message);
    console.info("doJoin message: "+message);
}
function doLeave(){
    var jsonMsg = {
       'cmd':'leave',
       'roomId':roomId,
       'uid':localUserId,
    };
    var message = JSON.stringify(jsonMsg);
    fishRTCEngine.sendMessage(message);
    console.info("doLeave message: "+message);
}

function openLocalStream(stream){
    console.log('Open Local stream');
    doJoin(roomId);
    localVideo.srcObject = stream;
    localStream = stream;
    
}

function initLocalStream(){
    navigator.mediaDevices.getUserMedia({
        audio:true,
        video:{
            width:640,
            height:480
        }
    })
        .then(openLocalStream)
        .catch(function(e) {
            alert("getUserMedia() error" + e.name);
        });
}

fishRTCEngine = new FishRTCEngine("ws://172.30.30.10:8099");
fishRTCEngine.createWebSocket();
document.getElementById('joinBtn').onclick = function(){
    roomId = document.getElementById('zero-RoomId').value;
    if(roomId == "" || roomId == "请输入房间ID"){
        alert('请输入房间ID');
        return;
    }
    console.log("加入按钮被点击,roomId:" + roomId);
    //初始化本地码流
    initLocalStream();
}

document.getElementById('leaveBtn').onclick = function(){
    console.log("离开按钮被点击");
    doLeave();
}