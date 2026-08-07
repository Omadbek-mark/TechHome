/** Project Standards:
  - Logging standards
  - Naming standards:
      function, method, variable => CAMEL
      class => PASCAL
      folders => KEBAB
      css => SNAKE
  - Error handling
*/
/** 
  Traditional API
  Rest API
  GraphQL API
 */

/** 
  Traditional FD   => SSR  => EJS
  Modern FD        => SPA  => REACT 
 */

  /** Cookies
    request join
    self destroy
   */
  
    /** Validation
    Frontend validation
    Backend validation
    Database validation
   */


// TASK T
function mergeSortedArrays(arr1: number[], arr2: number[]) {
  let i = 0;
  let i2 = 0;
  let result = [];

  while (i < arr1.length && i2 < arr2.length) {
    if (arr1[i] <= arr2[i2]) {
      result.push(arr1[i]);
      i += 1;
    } else {
      result.push(arr2[i2]);
      i2 += 1;
    }
  }
  while (i < arr1.length) {
    result.push(arr1[i]);
    i += 1;
  }
  while (i2 < arr2.length) {
    result.push(arr2[i2]);
    i2 += 1;
  }

  return result;
}

console.log("TASK T:", mergeSortedArrays([2, 3, 5], [5, 7]));



//  TASK S
// function missingNumber(arr: number[]) {
//   let n = arr.length;
//   let f = n * (n + 1) / 2;
//   let t = 0;
//   for (let numb of arr) {
//     t += numb
//   };

//   return f - t;
// }

// const result = missingNumber([3, 1, 2]);
// console.log("TASK S ts:", result);


  // TASK R
// function calculate(str: string): number {
//   const ele = str.split(" ");

//   const a = Number(ele[0]);
//   const getResult = ele[1];
//   const b = Number(ele[2]);

//   if (getResult === "+") {
//     return a + b;
//   } else if (getResult === "-") {
//     return a - b;
//   } else if (getResult === "*") {
//     return a * b;
//   } else if (getResult === "/") {
//     return a / b;
//   }

//   return 0;
// }

// const result = calculate("17 + 7");
// console.log("TASK R:", result);


// TASK Q
// function hasProperty(obj: object, prop: PropertyKey) {
//   let result = prop in obj;

//   return result;
//   }

// const result1 = (hasProperty({ "age": 22 }, "name"));
// const result2 = (hasProperty({ "age": 22 }, "age"));
// console.log("TASK Q:", result1);
// console.log("TASK Q2:", result2);

// TASK P
// function objectToArray(obj: object) {
//   let result = Object.entries(obj);

//   return result;
// }

// const result1 = objectToArray({b: 15, c: 20});
// console.log("TASK P:", result1);



// TASK O
// function calculateSumOfNumbers(arr: any[]) {
//   let result = 0;

//   for (let number of arr) {
//     if (typeof number === "number") {
//       result += number
//     }
//   }

//   return result;
// }

// const result = calculateSumOfNumbers([15, "17", { "numb": 11 }, true, 7]);
// console.log("TASK O:", result);


// TASK N
// function palindromCheck(palindrom: string) {
//   let checkPal = palindrom.split("").reverse().join("");

//   if (palindrom !== checkPal) {
//     return false
//   }
//   else {
//     return true
//   }
// }

// const result = palindromCheck("radar");
// console.log("TASK N:", result);
// const result1 = palindromCheck("typeScript");
// console.log("TASK N-2:", result1);


// // TASK M
// function getSquareNumbers(arr: number[]) {
//   let result = [];

//   for (let numb of arr) {
//     let getSquare = { number: numb, square: numb * numb };
//     result.push(getSquare);
//   }

//   return result;
// }

// const result = getSquareNumbers([25, 15, 9]);
// console.log("TASK M:", result);


// // TASK L
// function reverseSentence(ele: string) {
//   let words = ele.split(" ");

//   let reversedWords = [];

//   for (let word of words) {
//     let ele1 = word.split("")
//     let getReverse = ele1.reverse();
//     let reversedSentence = getReverse.join("");
//     reversedWords.push(reversedSentence);
//   }

//   return reversedWords.join(" ");
// } 

// const result1 = reverseSentence("we are on typeScript now");
// console.log("TASK L:", result1);


// // TASK K
// function countVowels(word: string) {
//   let vowels = "aeiouAEIOU";
//   let founded_vowels = [];
//   let count = 0;

//   for (let letter of word) {
//     if (vowels.includes(letter)) {
//       count++;
//       founded_vowels.push(letter);
//     }
//   }

//   return {count, founded_vowels};
// }

// const result3 = countVowels("Never Give Up!")
// console.log("TASK K:", result3);