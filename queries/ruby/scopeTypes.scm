(comment) @comment
(method) @function
(if) @if
(call) @call
(method) @namedFunction
(method 
  name: (_) @functionName)
(hash) @map

[
  (array)
  (string_array)
  (symbol_array)
] @list

(regex) @regex

(class) @class
(class
  name: (_) @className)

(assignment
  left: (_) @name)
(operator_assignment
  left: (_) @name)
(class
  name: (_) @name)
(method
  name: (_) @name)
