//test Copy
Object.prototype.copy = function () {
  function F () {};
  F.prototype = this;
  return new F();
}

function ObjectCopy(obj) {
  function F () {};
  F.prototype = obj;
  return new F();
}

var blah = {
  blah: "Yes"
};

console.log(blah); //Yes

var bleh = blah.copy();
var bluh = ObjectCopy(blah);

console.log(bleh.blah); //Yes
console.log(bluh.blah); //Yes

bleh.blah = "No";
bluh.bleh = "No";

console.log(blah); //Yes

console.log(bleh); //No
console.log(bluh); //No