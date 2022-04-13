(comment) @comment

(method) @function

[
 (string)
 (bare_string)
 (subshell)
 (heredoc_body)
] @string

(class) @class

(hash
  (pair
    key: (_) @key)) @map

(method_parameters
  . (_) @parameter.inner
  . ","? @_end
   (#make-range! "parameter.outer" @parameter.inner @_end))