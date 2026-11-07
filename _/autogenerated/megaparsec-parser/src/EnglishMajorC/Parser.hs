{-# LANGUAGE OverloadedStrings #-}

module EnglishMajorC.Parser (parseProgram) where

import Control.Monad (void, when)
import Data.Char (isAlphaNum, isControl, isSpace)
import Data.Text (Text)
import qualified Data.Text as Text
import Data.Void (Void)
import EnglishMajorC.Syntax
import Text.Megaparsec
  ( Parsec, ParseErrorBundle, choice, eof, getOffset, getSourcePos
  , many, match, notFollowedBy, runParser, satisfy, takeWhile1P, takeWhileP
  , (<?>)
  )
import Text.Megaparsec.Char (char, string)

type Parser = Parsec Void Text

parseProgram :: FilePath -> Text -> Either (ParseErrorBundle Text Void) Program
parseProgram = runParser (spacing *> (Program <$> many locatedItem) <* eof)

-- Whitespace alone is skipped. Comments remain first-class source items.
spacing :: Parser ()
spacing = void (takeWhileP (Just "whitespace") isSpace)

lexeme :: Parser value -> Parser value
lexeme parser = parser <* spacing

word :: Text -> Parser ()
word spelling = lexeme $ void (string spelling) <*
  notFollowedBy (satisfy (\character -> isAlphaNum character || character `elem` ['_', '-']))

phrase :: Text -> Parser ()
phrase = mapM_ word . Text.words

quotedName :: Parser Text
quotedName = lexeme $ do
  void (char '"')
  name <- takeWhile1P (Just "a nonempty quoted name")
    (\character -> character /= '"' && not (isControl character)
      && character /= '\x2028' && character /= '\x2029')
  void (char '"' <?> "closing quotation mark")
  when (Text.all isSpace name) (fail "A quoted name must contain a non-space character.")
  pure name

registerName :: Parser RegisterName
registerName = RegisterName <$> quotedName

instructionName :: Parser InstructionName
instructionName = InstructionName <$> quotedName

locatedItem :: Parser (Located SourceItem)
locatedItem = do
  start <- getSourcePos
  startOffset <- getOffset
  (original, item) <- match itemParser
  end <- getSourcePos
  endOffset <- getOffset
  spacing
  pure (Located (SourceRange start end startOffset endOffset) original item)

itemParser :: Parser SourceItem
itemParser = choice
  [ annotation
  , MachineDeclaration ARMv7AThumb <$
      (phrase "This program uses ARMv7-A Thumb instructions" *> char '.')
  , namingSentence <* char '.'
  , ExecutableOperation <$> operation <* char '.'
  ] <?> "a supported operation, declaration, instruction name, or annotation"

namingSentence :: Parser SourceItem
namingSentence = phrase "Name" *> choice
  [ do
      phrase "register"
      register <- physicalRegister
      name <- registerName
      pure (RegisterNameDeclaration register name)
  , FollowingInstructionName <$ phrase "the following instruction" <*> instructionName
  ]

-- The inspected finite source profile admits these five register spellings.
physicalRegister :: Parser PhysicalRegister
physicalRegister = choice
  [ PhysicalRegister number <$ word spelling
  | (spelling, number) <- [("zero", 0), ("one", 1), ("two", 2), ("three", 3), ("twelve", 12)]
  ] <?> "zero, one, two, three, or twelve"

annotation :: Parser SourceItem
annotation = do
  void (char '(')
  kind <- choice
    [ OrdinaryNote <$ string "NOTE:"
    , Explanation <$ string "WHY? BECAUSE:"
    ] <?> "NOTE: or WHY? BECAUSE:"
  body <- balancedBody
  pure (NonexecutingComment kind body)

-- Nested parentheses are retained. The closing delimiter is required;
-- instruction-like text inside an annotation cannot reach operation parsing.
balancedBody :: Parser Text
balancedBody = do
  pieces <- many $ choice
    [ do
        void (char '(')
        inner <- balancedBody
        pure ("(" <> inner <> ")")
    , Text.singleton <$> satisfy (\character -> character /= '(' && character /= ')')
    ]
  void (char ')' <?> "closing parenthesis of annotation")
  pure (Text.concat pieces)

operation :: Parser Operation
operation = choice
  [ OperatesOnRegistersOrMemory <$> putInstruction
  , OperatesOnRegistersOrMemory <$> compareInstruction
  , OperatesOnRegistersOrMemory <$> loadInstruction
  , OperatesOnRegistersOrMemory <$> increaseInstruction
  , OperatesOnRegistersOrMemory <$> decreaseInstruction
  , OperatesOnRegistersOrMemory <$> addInstruction
  , OperatesOnRegistersOrMemory <$> copyInstruction
  , ChangesExecutionIndex <$> conditionalBranch
  , ChangesExecutionIndex <$> replaceExecutionIndex
  ]

putInstruction :: Parser DataInstruction
putInstruction = phrase "Put" *> choice
  [ PutZeroWithoutChangingFlags <$ phrase "zero into" <*> registerName
      <* phrase "without changing the condition flags"
  , phrase "65535 into the" *> choice
      [ Put65535IntoLowSixteenBitsAndZeroIntoHighBits
          <$ phrase "low sixteen bits of" <*> registerName
          <* phrase "and zero into its high sixteen bits"
      , Put65535IntoHighSixteenBitsKeepingLowBits
          <$ phrase "high sixteen bits of" <*> registerName
          <* phrase "without changing its low sixteen bits"
      ]
  ]

compareInstruction :: Parser DataInstruction
compareInstruction = do
  phrase "Compare"
  left <- registerName
  phrase "with"
  result <- choice
    [ CompareWithZeroAndUpdateFlags left <$ phrase "zero"
    , CompareRegistersAndUpdateFlags left <$> registerName
    ]
  phrase "and update the condition flags"
  pure result

loadInstruction :: Parser DataInstruction
loadInstruction = LoadFourBytesFromAddressIntoRegister
  <$ phrase "Load exactly four bytes from the address in" <*> registerName
  <* phrase "into" <*> registerName

increaseInstruction :: Parser DataInstruction
increaseInstruction = IncreaseByFourWithoutChangingFlags
  <$ phrase "Increase" <*> registerName
  <* phrase "by four without changing the condition flags"

decreaseInstruction :: Parser DataInstruction
decreaseInstruction = DecreaseByOneWithoutChangingFlags
  <$ phrase "Decrease" <*> registerName
  <* phrase "by one without changing the condition flags"

addInstruction :: Parser DataInstruction
addInstruction = AddKeepingLowThirtyTwoBitsWithoutChangingFlags
  <$ phrase "Add" <*> registerName <* phrase "to" <*> registerName
  <* phrase "and keep only the lowest thirty-two result bits without changing the condition flags"

copyInstruction :: Parser DataInstruction
copyInstruction = CopyWithoutChangingFlags
  <$ phrase "Copy" <*> registerName <* phrase "into" <*> registerName
  <* phrase "without changing the condition flags"

conditionalBranch :: Parser ControlFlowInstruction
conditionalBranch = ReplaceExecutionIndexIfZeroFlagIsOne
  <$ phrase "If the zero flag is one, replace the execution index with the instruction named"
  <*> instructionName

replaceExecutionIndex :: Parser ControlFlowInstruction
replaceExecutionIndex = phrase "Replace the execution index with the instruction" *> choice
  [ ReplaceExecutionIndexUnconditionally <$ phrase "named" <*> instructionName
  , ReplaceExecutionIndexWithLinkRegisterAddress <$ phrase "address in the link register"
  ]
