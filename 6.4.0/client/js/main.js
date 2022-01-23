"use strict";
// import { createRequire } from "module";
// const require = createRequire(import.meta.url);

// const { clearTimeout } = require("timers");

// join 主动加入房间
// leave 主动离开房间
// new-peer 有人加入房间，通知已经在房间的人
// peer-leave 有人离开房间，通知已经在房间的人
// offer 发送offer给对端peer
// answer发送offer给对端peer
// candidate 发送candidate给对端peer
const SIGNAL_TYPE_JOIN = "join";
const SIGNAL_TYPE_RESP_JOIN = "resp-join"; // 告知加入者对方是谁
const SIGNAL_TYPE_LEAVE = "leave";
const SIGNAL_TYPE_NEW_PEER = "new-peer";
const SIGNAL_TYPE_PEER_LEAVE = "peer-leave";
const SIGNAL_TYPE_OFFER = "offer";
const SIGNAL_TYPE_ANSWER = "answer";
const SIGNAL_TYPE_CANDIDATE = "candidate";

const IP_URL = "172.30.30.10"
const SERVER_URL = "wss://"+IP_URL + ":8098/ws";

var localUserId = Math.random().toString(36).substr(2); //本地uid
var remoteUserId = -1; //对端uid
var roomId = 0;

var localVideo = document.querySelector("#localVideo");
var remoteVideo = document.querySelector("#remoteVideo");
var localStream = null;
var remoteStream = null;
var pc = null; //RTCPeerConnection

var lockReconnect = false;//避免ws重复连接

var fishRTCEngine;

function handleIceCandidate(event) {
  console.info("handleIceCandidate");
  if (event.candidate) {
    //不为空才发送candidate
    var jsonMsg = {
      cmd: "candidate",
      roomId: roomId,
      uid: localUserId,
      remoteUid: remoteUserId,
      msg: JSON.stringify(event.candidate),
    };
    var message = JSON.stringify(jsonMsg);
    fishRTCEngine.sendMessage(message);
    // console.info("handleIceCandidate message: "+message);
    console.info("send Candidate message:");
  } else {
    //不再去请求打洞了
    console.warn("End of candidates");
  }
}

function handleRemoteStreamAdd(event) {
  console.info("handleRemoteStreamAdd");
  remoteStream = event.streams[0];
  remoteVideo.srcObject = remoteStream;
}
function handleConnectionStateChange(){
    if(pc != null){
        console.info("handleConnectionStateChange: " + pc.connectionState);
    }
}
function handleIceConnectionStateChange(){
    if(pc != null){
        console.info("handleIceConnectionStateChange: " + pc.iceConnectionState);
    }
}

function createPeerConnection() {
  var defaultConfiguration = {
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
    iceTransportPolicy: "relay", //relay or all
    // 修改ice数组测试效果，需要进行封装
    iceServers: [
      {
        urls: [
          "turn:"+IP_URL+":3478?transport=udp",
          "turn:"+IP_URL+":3478?transport=tcp", // 可以插入多个进行备选
        ],
        username: "ydy",
        credential: "123456",
      },
      {
        urls: ["stun:"+IP_URL+":3478"],
      },
    ],
  };
  pc = new RTCPeerConnection(defaultConfiguration);
  pc.onicecandidate = handleIceCandidate;
  pc.ontrack = handleRemoteStreamAdd;
  pc.oniceconnectionstatechange = handleIceConnectionStateChange;
  pc.onconnectionstatechange = handleConnectionStateChange;
  localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
}

function createOfferAndSendMessage(session) {
  pc.setLocalDescription(session)
    .then(function () {
      var jsonMsg = {
        cmd: "offer",
        roomId: roomId,
        uid: localUserId,
        remoteUid: remoteUserId,
        msg: JSON.stringify(session),
      };
      var message = JSON.stringify(jsonMsg);
      fishRTCEngine.sendMessage(message);
      // console.info("send offer message: "+message);
      console.info("send offer message: ");
    })
    .catch(function (error) {
      console.error("offer setLocalDescription failed: " + error);
    });
}
function handleCreateOfferError(error) {
  console.error("handleCreateOfferError failed: " + error);
}

function createAnswerAndSendMessage(session) {
  console.info("doAnswer createAnswerAndSendMessage");
  pc.setLocalDescription(session)
    .then(function () {
      var jsonMsg = {
        cmd: "answer",
        roomId: roomId,
        uid: localUserId,
        remoteUid: remoteUserId,
        msg: JSON.stringify(session),
      };
      var message = JSON.stringify(jsonMsg);
      fishRTCEngine.sendMessage(message);
      console.info("send answer message: ");
      // console.info("send answer message: "+message);
    })
    .catch(function (error) {
      console.error("answer setLocalDescription failed: " + error);
    });
}
function handleCreateAnswerError(error) {
  console.error("handleCreateAnswerError failed: " + error);
}
var FishRTCEngine = function (wsUrl) {
  this.init(wsUrl);
  fishRTCEngine = this;
  return this;
};

FishRTCEngine.prototype.init = function (wsUrl) {
  //设置wbsocket url
  this.wsUrl = wsUrl;
  //websocket对象
  this.signaling = null;
};

FishRTCEngine.prototype.createWebSocket = function () {
    fishRTCEngine = this;
    console.info("this.wsUrl: "+this.wsUrl);
    fishRTCEngine.signaling = new WebSocket(this.wsUrl);
    fishRTCEngine.signaling.onopen = function () {
      fishRTCEngine.timer = window.setInterval(function(){
        console.info("进入心跳");
        var ping = {"type":"ping"};
        console.info("发送心跳");
        fishRTCEngine.signaling.send(JSON.stringify(ping));
      },5000);
      console.info("发送连接");
      fishRTCEngine.onOpen();
    };
    fishRTCEngine.signaling.onmessage = function (ev) {
      fishRTCEngine.onMessage(ev);
    };
  
    fishRTCEngine.signaling.onerror = function (ev) {
      fishRTCEngine.onError(ev);
    };
  
    fishRTCEngine.signaling.onclose = function (ev) {
      fishRTCEngine.onClose(ev);
    };
};

FishRTCEngine.prototype.onOpen = function () {
  // heartCheck.reset().start();
  console.log("websocket open"+new Date().toLocaleString());
};

FishRTCEngine.prototype.onMessage = function (event) {
  // heartCheck.reset().start();//收到任何消息说明当前连接是正常的
  console.log("websocket onMessage:" + event.data);
  var jsonMsg = null;
  try {
      jsonMsg = JSON.parse(event.data);
      if(jsonMsg == 'pong') return;
  } catch (e) {
    console.warn("onMessage parse Json failed: " + e);
    return;
  }
  switch (jsonMsg.cmd) {
    case SIGNAL_TYPE_NEW_PEER:
      handleRemoteNewPeer(jsonMsg);
      break;
    case SIGNAL_TYPE_RESP_JOIN:
      handleResponseJoin(jsonMsg);
      break;
    case SIGNAL_TYPE_PEER_LEAVE:
      handleRemotePeerLeave(jsonMsg);
      break;
    case SIGNAL_TYPE_OFFER:
      handleRemoteOffer(jsonMsg);
      break;
    case SIGNAL_TYPE_ANSWER:
      handleRemoteAnswer(jsonMsg);
      break;
    case SIGNAL_TYPE_CANDIDATE:
      handleRemoteCandidate(jsonMsg);
      break;
  }
};

FishRTCEngine.prototype.onError = function (event) {
  reconnect(fishRTCEngine.wsUrl);
  console.log("websocket onError" + event.data);
};

FishRTCEngine.prototype.onClose = function (event) {
  reconnect(fishRTCEngine.wsUrl);
  console.log(
    "websocket onClose code:" + event.code + ",reason:" + EventTarget.reason
  );
};

FishRTCEngine.prototype.sendMessage = function (message) {
  this.signaling.send(message);
};
function handleResponseJoin(message) {
  console.info("handleResponseJoin, remoteUid: " + message.remoteUid);
  remoteUserId = message.remoteUid;
  //doOffer();
}
function handleRemotePeerLeave(message) {
  console.info("handleRemotePeerLeave, remoteUid: " + message.remoteUid);
  remoteVideo.srcObject = null; //远程对象置空
  if (pc != null) {
    pc.close();
    pc = null;
  }
}
//新人加入房间保存userId
function handleRemoteNewPeer(message) {
  console.info("handleRemoteNewPeer, remoteUid: " + message.remoteUid);
  remoteUserId = message.remoteUid;
  doOffer();
}
function handleRemoteOffer(message) {
  console.info("handleRemoteOffer");
  if (pc == null) {
    createPeerConnection();
  }
  var desc = JSON.parse(message.msg);
  pc.setRemoteDescription(desc);
  doAnswer();
}
function handleRemoteAnswer(message) {
  console.info("handleRemoteAnswer");
  var desc = JSON.parse(message.msg);
  // console.info("desc: " + desc);
  pc.setRemoteDescription(desc);
}
function handleRemoteCandidate(message) {
  console.info("handleRemoteCandidate");
  var candidate = JSON.parse(message.msg);
  pc.addIceCandidate(candidate).catch((e) => {
    console.error("addIceCandidate failed: " + e.name);
  });
}
function doOffer() {
  //创建RCTPeerConnection
  if (pc == null) {
    createPeerConnection();
  }
  pc.createOffer()
    .then(createOfferAndSendMessage)
    .catch(handleCreateOfferError);
}

function doAnswer() {
  console.info("doAnswer");
  pc.createAnswer()
    .then(createAnswerAndSendMessage)
    .catch(handleCreateAnswerError);
}

function doJoin(roomId) {
  console.info("doJoin roomId:" + roomId);
  var jsonMsg = {
    cmd: "join",
    roomId: roomId,
    uid: localUserId,
  };
  var message = JSON.stringify(jsonMsg);
  fishRTCEngine.sendMessage(message);
  console.info("doJoin message: " + message);
}
function doLeave() {
  var jsonMsg = {
    cmd: "leave",
    roomId: roomId,
    uid: localUserId,
  };
  var message = JSON.stringify(jsonMsg);
  fishRTCEngine.sendMessage(message); //发信令给服务器离开
  console.info("doLeave message: " + message);
  hangup(); //挂断
}
function hangup() {
  localVideo.srcObject = null; //0.关闭自己的本地显示
  remoteVideo.srcObject = null; //1.关闭远端的流
  closeLocalStream(); //2.关闭本地流，摄像头关闭，麦克风关闭
  if (pc != null) {
    //3.关闭RTCPeerConnection
    pc.close();
    pc = null;
  }
}
function closeLocalStream() {
  if (localStream != null) {
    localStream.getTracks().forEach((track) => {
      track.stop();
    });
  }
}

function openLocalStream(stream) {
  console.log("Open Local stream");
  doJoin(roomId);
  localVideo.srcObject = stream;
  localStream = stream;
}

function initLocalStream() {
  navigator.mediaDevices
    .getUserMedia({
      audio: true,
    //   video: true,
      video:{
          width:640,
          height:480
      }
    })
    .then(openLocalStream)
    .catch(function (e) {
      alert("getUserMedia() error" + e.name);
    });
}
// fishRTCEngine = new FishRTCEngine(SERVER_URL);
// fishRTCEngine.createWebSocket();
createWebSocketConnection(SERVER_URL);
function createWebSocketConnection(url){
  try{
    fishRTCEngine = new FishRTCEngine(url);
    fishRTCEngine.createWebSocket();
  }catch(e){
    reconnect(url);
    console.log(e);
  }

}

document.getElementById("joinBtn").onclick = function () {
  roomId = document.getElementById("zero-RoomId").value;
  if (roomId == "" || roomId == "请输入房间ID") {
    alert("请输入房间ID");
    return;
  }
  console.log("加入按钮被点击,roomId:" + roomId);
  //初始化本地码流
  initLocalStream();
};

document.getElementById("leaveBtn").onclick = function () {
  console.log("离开按钮被点击");
  doLeave();
};
function reconnect(url){
  console.info("重新连接:url: "+url);
  if(lockReconnect) return;
  lockReconnect = true;
  setTimeout(function(){//没连上会一直重连，设置延迟避免请求过多
    fishRTCEngine.createWebSocket();
    lockReconnect = false;
  },2000);
}
//心跳检测
var heartCheck = {
    timeout:5000,//一分钟发一次心跳
    timeoutObj:null,
    serverTimeoutObj:null,
    reset:function(){
      clearTimeout(this.timeoutObj);
      clearTimeout(this.serverTimeoutObj);
      return this;
    },
    start:function(){
      var self = this;
      this.timeoutObj = setTimeout(function(){
      //这里发送一个心跳，后端收到后，返回一个心跳消息
      //onmessage拿到返回的心跳就说明连接正常
      var ping = {"type":"ping"};
      fishRTCEngine.signaling.send(JSON.stringify(ping));
      console.log('ping!');
      self.serverTimeoutObj = setTimeout(function(){
        //如果超过一定时间还没重置，说明后端主动断开了
        //如果onclose会执行reconnect，我们执行ws。close()就行了，如果直接执行reconnect 会触发onclose导致重连两次
        console.log('心跳内部关闭连接');
        fishRTCEngine.signaling.close();
      },self.timeout)
      },this.timeout);
    }
}