# TASK Z
def sumEvens(arr):
    total = 0

    for numb in arr:
        if numb % 2 == 0:
            total += numb

    return total


print("TASK Z, sumEvens:", sumEvens([2, 5, 8, 6, 7]))


# TASK Y
# def findIntersection(arr1, arr2):
#     set2 = set(arr2)
#     result = []
#     for num in arr1:
#         if num in set2:
#             if num not in result:
#                 result.append(num)

#     return result


# print("TASK Y:", findIntersection([5, 7, 15, 22], [7, 15, 11, 3]))

# TASK X
# def countOccurrences(obj, target):
#     count = 0

#     for key, value in obj.items():
#         if key == target:
#             count += 1

#         if isinstance(value, dict):
#             count += countOccurrences(value, target)

#     return count


# print(
#     "TASK X:",
#     countOccurrences({"version": "new", "s": {"version": "old", "d": {"version": "rare"}}}, "version"))


# TASK W
# def chunkArray(arr, size):
#     result = []

#     for i in range(0, len(arr), size):
#         chunk = arr[i: i + size]
#         result.append(chunk)

#     return result


# print("TASK W:", chunkArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 0], 3))
# print("TASK W-1:", chunkArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 0], 4))
# print("TASK W-2:", chunkArray([1, 2, 3, 4, 5, 6, 7, 8, 9], 2))

# TASK V
# def countChars(s: str) -> dict:
#     result = {}

#     for char in s:
#         if char in result:
#             result[char] += 1
#         else:
#             result[char] = 1

#     return result


# print(countChars("difficult"))


# TASK T
# def merge_sorted_arrays(arr1, arr2):
#     i = 0
#     i2 = 0
#     result = []

#     while i < len(arr1) and i2 < len(arr2):
#         if arr1[i] <= arr2[i2]:
#             result.append(arr1[i])
#             i += 1
#         else:
#             result.append(arr2[i2])
#             i2 += 1
#     while i < len(arr1):
#         result.append(arr1[i])
#         i += 1
#     while i2 < len(arr2):
#         result.append(arr2[i2])
#         i2 += 1

#     return result


# print("TASK T:", merge_sorted_arrays([2, 3, 5], [5, 7]))


# TASK S
# def missing_number(arr):
#     n = len(arr)
#     f = n * (n + 1) // 2
#     t = sum(arr)

#     return f - t


# print("TASK S py:", missing_number([2, 0, 3]))


# TASK R
# def calculate(stringcalc: str) -> int:
#     calculate_str = stringcalc.split()
#     a = int(calculate_str[0])
#     get_result = calculate_str[1]
#     b = int(calculate_str[2])

#     if get_result == "+":
#         return a + b
#     elif get_result == "-":
#         return a - b
#     elif get_result == "*":
#         return a * b
#     elif get_result == "/":
#         return a // b


# print("TASK R:", calculate("15 + 7"))


# TASK Q
# def has_property(object, prop):
#     result = prop in object
#     return result


# print(has_property({"age": 22}, "name"))
# print(has_property({"age": 22}, "age"))


# TASK P
# def object_to_array(object):
#     result = []

#     for key in object:
#         a = [key, object.get(key)]
#         result.append(a)

#     return result


# print("object_to_array:", object_to_array({"b": 15, "c": 20}))


# TASK O
# def calculate_sum_of_numbers(arr):
#     result = 0

#     for number in arr:
#         if type(number) == int:
#             result += number

#     return result


# print("calculate_sum_of_numbers:", calculate_sum_of_numbers(
#     [15, "17", {"numb": 11}, True, 7]))


# TASK N
# def palindrom_check(palindrom):
#     check_pal = palindrom[::-1]

#     if palindrom == check_pal:
#         return True

#     else:
#         return False

# print("palindrom_check:", palindrom_check("level"))
# print("palindrom_check:", palindrom_check("python"))


# TASK M
# def get_square_numbers(arr):
#     result = []

#     for numb in arr:
#         get_square = {"number": numb, "square": numb * numb}
#         result.append(get_square)

#     return result

# print("get_square_numbers:", get_square_numbers([25, 15, 9]))


# TASK L
# def reverse_sentence(sentence):
#     words = sentence.split(" ")
#     reversed_words = []

#     for word in words:
#         word[::-1]
#         reversed_words.append(word[::-1])

#     reversed_sentence = " ".join(reversed_words)
#     return reversed_sentence

# print(reverse_sentence("we are practicing python!"))


# TASK K
# def countVowels(word):
#     vowels = "aeiouAEIOU"
#     find_vowels = []
#     count = 0

#     for letter in word:
#         if letter in vowels:
#             count += 1
#             find_vowels.append(letter)  # it is just practice for myself!

#     return count, find_vowels

# print(countVowels("Never Give Up!"))
