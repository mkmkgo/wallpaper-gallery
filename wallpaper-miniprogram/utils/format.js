var CHAR_MAP_DECODE = {
  Q: "A", W: "B", E: "C", R: "D", T: "E", Y: "F", U: "G", I: "H", O: "I", P: "J",
  A: "K", S: "L", D: "M", F: "N", G: "O", H: "P", J: "Q", K: "R", L: "S", Z: "T",
  X: "U", C: "V", V: "W", B: "X", N: "Y", M: "Z",
  q: "a", w: "b", e: "c", r: "d", t: "e", y: "f", u: "g", i: "h", o: "i", p: "j",
  a: "k", s: "l", d: "m", f: "n", g: "o", h: "p", j: "q", k: "r", l: "s", z: "t",
  x: "u", c: "v", v: "w", b: "x", n: "y", m: "z",
  5: "0", 6: "1", 7: "2", 8: "3", 9: "4", 0: "5", 1: "6", 2: "7", 3: "8", 4: "9",
  "-": "+", _: "/", ".": "="
};

var VERSION_PREFIX = "v1.";

function base64Decode(input) {
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  var str = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
  var output = "";
  var chr1, chr2, chr3;
  var enc1, enc2, enc3, enc4;
  var i = 0;
  while (i < str.length) {
    enc1 = chars.indexOf(str.charAt(i++));
    enc2 = chars.indexOf(str.charAt(i++));
    enc3 = chars.indexOf(str.charAt(i++));
    enc4 = chars.indexOf(str.charAt(i++));
    chr1 = (enc1 << 2) | (enc2 >> 4);
    chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    chr3 = ((enc3 & 3) << 6) | enc4;
    output = output + String.fromCharCode(chr1);
    if (enc3 !== 64) {
      output = output + String.fromCharCode(chr2);
    }
    if (enc4 !== 64) {
      output = output + String.fromCharCode(chr3);
    }
  }
  return output;
}

function utf8Decode(str) {
  var bytes = [];
  for (var i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i));
  }
  var result = "";
  var idx = 0;
  while (idx < bytes.length) {
    var byte1 = bytes[idx++];
    if (byte1 < 0x80) {
      result += String.fromCharCode(byte1);
    } else if (byte1 >= 0xC0 && byte1 < 0xE0) {
      var byte2 = bytes[idx++];
      result += String.fromCharCode(((byte1 & 0x1F) << 6) | (byte2 & 0x3F));
    } else if (byte1 >= 0xE0 && byte1 < 0xF0) {
      var byte2 = bytes[idx++];
      var byte3 = bytes[idx++];
      result += String.fromCharCode(((byte1 & 0x0F) << 12) | ((byte2 & 0x3F) << 6) | (byte3 & 0x3F));
    } else if (byte1 >= 0xF0) {
      var byte2 = bytes[idx++];
      var byte3 = bytes[idx++];
      var byte4 = bytes[idx++];
      var codePoint = ((byte1 & 0x07) << 18) | ((byte2 & 0x3F) << 12) | ((byte3 & 0x3F) << 6) | (byte4 & 0x3F);
      codePoint -= 0x10000;
      result += String.fromCharCode(0xD800 + (codePoint >> 10), 0xDC00 + (codePoint & 0x3FF));
    }
  }
  return result;
}

function decodeData(encoded) {
  try {
    if (!encoded || typeof encoded !== "string") {
      return "[]";
    }
    if (!encoded.startsWith(VERSION_PREFIX)) {
      return "[]";
    }
    var reversed = encoded.slice(VERSION_PREFIX.length).split("").reverse().join("");
    var base64 = "";
    for (var i = 0; i < reversed.length; i++) {
      var ch = reversed[i];
      base64 += CHAR_MAP_DECODE[ch] || ch;
    }
    var rawBytes = base64Decode(base64);
    var decoded = utf8Decode(rawBytes);
    return decoded;
  } catch (error) {
    console.error("解码失败:", error);
    return "[]";
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 B";
  var k = 1024;
  var sizes = ["B", "KB", "MB", "GB"];
  var i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

module.exports = {
  decodeData: decodeData,
  formatFileSize: formatFileSize
};
