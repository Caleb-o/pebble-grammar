module.exports = grammar({
  name: "pebble",

  extras: ($) => [/\s/, $.comment],

  rules: {
    source_file: ($) => repeat($._definition),

    _definition: ($) =>
      choice(
        $.function_declaration,
        $.type_declaration,
        $.variable_declaration,
        $.extern_declaration,
        $.extern_block,
        $.import_statement,
      ),

    // Comments
    comment: ($) => token(seq("//", /.*/)),

    type: ($) => $._type,

    // Import statement
    import_statement: ($) =>
      seq("import", field("module", $.string_literal), ";"),

    // Function declaration
    function_declaration: ($) =>
      seq(
        "fn",
        optional(field("calling_convention", $.string_literal)),
        field("name", $.identifier),
        field("parameters", $.parameter_list),
        optional(field("return_type", $._type)), // No -> needed
        field("body", $.block),
      ),

    parameter_list: ($) => seq("(", optional(sep1($.parameter, ",")), ")"),

    // Parameter
    parameter: ($) =>
      seq(optional("..."), field("name", $.identifier), field("type", $._type)),

    // Type declaration
    type_declaration: ($) =>
      seq("type", field("name", $.identifier), "=", $._type),

    // Variable declaration
    variable_declaration: ($) =>
      seq(
        choice("let", "var"),
        field("name", $.identifier),
        optional(field("type", $.type)),
        optional(seq("=", field("value", $._expression))),
        ";",
      ),

    // Extern block
    extern_block: ($) =>
      seq(
        "extern",
        optional(field("library", $.string_literal)),
        "{",
        repeat($._extern_item),
        "}",
      ),

    // Individual extern declarations (for both block and standalone)
    _extern_item: ($) =>
      choice(
        $.extern_function_declaration,
        $.extern_type_declaration,
        $.extern_variable_declaration,
      ),

    extern_function_declaration: ($) =>
      seq(
        "fn",
        field("name", $.identifier),
        field("parameters", $.parameter_list),
        optional(field("return_type", $._type)),
        ";",
      ),

    extern_type_declaration: ($) =>
      seq("type", field("name", $.identifier), ";"),

    extern_variable_declaration: ($) =>
      seq(
        choice("let", "var"),
        field("name", $.identifier),
        optional(field("type", $.type)),
        optional(seq("=", field("value", $._expression))),
        ";",
      ),

    // Standalone extern declaration
    extern_declaration: ($) =>
      seq(
        "extern",
        optional(field("library", $.string_literal)),
        choice(
          $.extern_function_declaration,
          $.extern_type_declaration,
          $.extern_variable_declaration,
        ),
      ),

    // Types
    _type: ($) =>
      choice(
        $.primitive_type,
        $.qualified_path,
        $.pointer_type,
        $.array_type,
        $.slice_type,
        $.optional_type,
        $.function_type,
      ),

    primitive_type: ($) =>
      choice(
        "void",
        "bool",
        "int",
        "str",
        "char",
        "f32",
        "f64",
        "i8",
        "i16",
        "i32",
        "i64",
        "isize",
        "u8",
        "u16",
        "u32",
        "u64",
        "usize",
        "struct",
        "enum",
      ),

    pointer_type: ($) => prec.right(seq("*", $._type)),

    array_type: ($) =>
      seq(
        "[",
        field("size", $._expression),
        "]",
        field("element_type", $._type),
      ),

    slice_type: ($) => seq("[", "]", field("element_type", $._type)),

    optional_type: ($) => prec.right(seq("?", $._type)),

    function_type: ($) =>
      prec.right(
        seq(
          "fn",
          optional(field("calling_convention", $.string_literal)),
          "(",
          optional(sep1($._type, ",")),
          ")",
          optional($._type),
        ),
      ),

    // Qualified path (for expressions and types)
    qualified_path: ($) =>
      seq(
        field("head", $.identifier),
        repeat(seq("::", field("tail", $.identifier))),
      ),

    // Block
    block: ($) => seq("{", repeat($._statement), "}"),

    // Statements
    _statement: ($) =>
      choice(
        $.variable_declaration,
        $.return_statement,
        $.if_statement,
        $.while_statement,
        $.for_statement,
        $.loop_statement,
        $.switch_statement,
        $.print_statement,
        $.expression_statement,
        $.block,
        $.break_statement,
        $.continue_statement,
        $.defer_statement,
      ),

    return_statement: ($) => seq("return", optional($._expression), ";"),

    if_statement: ($) =>
      prec.right(
        seq(
          "if",
          field("condition", $._expression),
          field("consequence", $.block),
          optional(
            seq("else", field("alternative", choice($.block, $.if_statement))),
          ),
        ),
      ),

    while_statement: ($) =>
      seq("while", field("condition", $._expression), field("body", $.block)),

    for_statement: ($) =>
      seq(
        "for",
        field(
          "initializer",
          choice($.variable_declaration, seq($._expression, ";")),
        ),
        field("condition", $._expression),
        ";",
        field("update", $._expression),
        field("body", $.block),
      ),

    // Switch statement
    switch_statement: ($) =>
      seq(
        "switch",
        field("condition", $._expression),
        "{",
        repeat($.case_clause),
        optional($.else_clause),
        "}",
      ),

    case_clause: ($) =>
      seq(
        "case",
        field("value", $._expression),
        ":",
        field("body", choice($.block, $.case_body)),
      ),

    else_clause: ($) =>
      seq("else", ":", field("body", choice($.block, $.case_body))),

    case_body: ($) =>
      repeat1(
        choice(
          $.variable_declaration,
          $.return_statement,
          $.if_statement,
          $.while_statement,
          $.for_statement,
          $.loop_statement,
          $.switch_statement,
          $.print_statement,
          $.expression_statement,
          $.break_statement,
          $.continue_statement,
          $.defer_statement,
        ),
      ),

    // Loop statement
    loop_statement: ($) =>
      seq("loop", field("range", $.range_expression), field("body", $.block)),

    print_statement: ($) =>
      seq("print", $._expression, repeat(seq(",", $._expression)), ";"),

    // Range expression
    range_expression: ($) =>
      prec.left(
        2,
        seq(
          field("start", $._expression),
          choice("..", "..="),
          field("end", $._expression),
        ),
      ),

    break_statement: ($) => seq("break", ";"),
    continue_statement: ($) => seq("continue", ";"),

    expression_statement: ($) => seq($._expression, ";"),

    defer_statement: ($) => seq("defer", field("statement", $._statement)),

    // Expressions
    _expression: ($) =>
      choice(
        $.qualified_path,
        $.literal,
        $.binary_expression,
        $.unary_expression,
        $.call_expression,
        $.field_expression,
        $.index_expression,
        $.slice_expression,
        $.parenthesized_expression,
        $.cast_expression,
        $.some_expression,
        $.none_expression,
        $.context_expression,
        $.function_expression,
      ),

    binary_expression: ($) =>
      choice(
        prec.left(1, seq($._expression, "||", $._expression)),
        prec.left(2, seq($._expression, "&&", $._expression)),
        prec.left(3, seq($._expression, "|", $._expression)),
        prec.left(4, seq($._expression, "^", $._expression)),
        prec.left(5, seq($._expression, "&", $._expression)),
        prec.left(6, seq($._expression, choice("==", "!="), $._expression)),
        prec.left(
          7,
          seq($._expression, choice("<", "<=", ">", ">="), $._expression),
        ),
        prec.left(8, seq($._expression, choice("<<", ">>"), $._expression)),
        prec.left(9, seq($._expression, choice("+", "-"), $._expression)),
        prec.left(10, seq($._expression, choice("*", "/"), $._expression)),
      ),

    unary_expression: ($) =>
      prec.right(
        11,
        choice(
          seq(choice("-", "!", "~", "&", "*"), $._expression),
          seq("sizeof", choice($._expression, $._type)),
        ),
      ),

    call_expression: ($) =>
      prec(
        12,
        seq(
          field("function", $._expression),
          field("arguments", $.argument_list),
        ),
      ),

    argument_list: ($) => seq("(", optional(sep1($._expression, ",")), ")"),

    field_expression: ($) =>
      prec(
        13,
        seq(field("object", $._expression), ".", field("field", $.identifier)),
      ),

    // Index expression - for single index: array[i]
    index_expression: ($) =>
      prec(
        13,
        seq(
          field("array", $._expression),
          "[",
          field("index", $._expression),
          "]",
        ),
      ),

    // Slice expression
    slice_expression: ($) =>
      prec(
        13,
        seq(
          field("array", $._expression),
          "[",
          optional(field("start", $._expression)),
          ":",
          optional(field("end", $._expression)),
          "]",
        ),
      ),

    parenthesized_expression: ($) => seq("(", $._expression, ")"),

    cast_expression: ($) => prec.left(3, seq($._expression, "as", $._type)),

    // Literals
    literal: ($) =>
      choice(
        $.integer_literal,
        $.float_literal,
        $.string_literal,
        $.char_literal,
        $.boolean_literal,
        $.nil_literal,
      ),

    integer_literal: ($) => choice(/[0-9]+/, $.hex_literal),

    hex_literal: ($) => /0[xX][0-9a-fA-F]+/,

    float_literal: ($) => /[0-9]+\.[0-9]+([eE][+-]?[0-9]+)?/,

    string_literal: ($) =>
      seq('"', repeat(choice($.escape_sequence, /[^"\\]/)), '"'),

    char_literal: ($) => seq("'", choice($.escape_sequence, /[^'\\]/), "'"),

    escape_sequence: ($) =>
      token(
        seq("\\", choice(/[nrt\\"'0]/, /x[0-9a-fA-F]{2}/, /u[0-9a-fA-F]{4}/)),
      ),

    boolean_literal: ($) => choice("true", "false"),

    nil_literal: ($) => "nil",

    some_expression: ($) => seq("some", field("value", $._expression)),

    none_expression: ($) => "none",

    context_expression: ($) => "context",

    function_expression: ($) =>
      seq(
        "fn",
        optional(field("calling_convention", $.string_literal)),
        field("parameters", $.parameter_list),
        optional(field("return_type", $._type)),
        field("body", $.block),
      ),

    identifier: ($) => /[a-zA-Z_][a-zA-Z0-9_]*/,
  },
});

// Helper function for comma-separated lists
function sep1(rule, separator) {
  return seq(rule, repeat(seq(separator, rule)));
}
