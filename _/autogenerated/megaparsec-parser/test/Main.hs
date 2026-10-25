{-# LANGUAGE OverloadedStrings #-}

module Main (main) where

import Control.Monad (unless)
import Data.Either (isLeft)
import Data.Text (Text)
import qualified Data.Text as Text
import qualified Data.Text.IO as TextIO
import EnglishMajorC.Parser (parseProgram)
import EnglishMajorC.Syntax
import EnglishMajorC.Validation
import Paths_english_major_c_megaparsec (getDataFileName)
import System.Exit (exitFailure)
import Text.Megaparsec (errorBundlePretty, sourceLine, sourceName, unPos)

main :: IO ()
main = do
  fixturePath <- getDataFileName "fixtures/unknown-entry-sum.english"
  source <- TextIO.readFile fixturePath
  program <- parseSuccessfully source
  let items = programItems program
      operations = [operation | Located _ _ (ExecutableOperation operation) <- items]
      comments = "(NOTE: Put zero into \"undeclared\" without changing the condition flags. (nested (text)))\n"
        <> "(WHY? BECAUSE: a note can contain periods. It can span\nlines.)\n"
      register = RegisterName
      label = InstructionName
      dataOperation = OperatesOnRegistersOrMemory
      branch = ChangesExecutionIndex
      expected =
        [ dataOperation (PutZeroWithoutChangingFlags (register "running total"))
        , dataOperation (Put65535IntoLowSixteenBitsAndZeroIntoHighBits (register "unknown marker"))
        , dataOperation (Put65535IntoHighSixteenBitsKeepingLowBits (register "unknown marker"))
        , dataOperation (CompareWithZeroAndUpdateFlags (register "number of entries remaining"))
        , branch (ReplaceExecutionIndexIfZeroFlagIsOne (label "return the result"))
        , dataOperation (LoadFourBytesFromAddressIntoRegister
            (register "address of the next entry") (register "current entry"))
        , dataOperation (IncreaseByFourWithoutChangingFlags (register "address of the next entry"))
        , dataOperation (DecreaseByOneWithoutChangingFlags (register "number of entries remaining"))
        , dataOperation (CompareRegistersAndUpdateFlags (register "current entry") (register "unknown marker"))
        , branch (ReplaceExecutionIndexIfZeroFlagIsOne (label "check whether any entries remain"))
        , dataOperation (AddKeepingLowThirtyTwoBitsWithoutChangingFlags
            (register "current entry") (register "running total"))
        , branch (ReplaceExecutionIndexUnconditionally (label "check whether any entries remain"))
        , dataOperation (CopyWithoutChangingFlags (register "running total") (register "address of the next entry"))
        , branch ReplaceExecutionIndexWithLinkRegisterAddress
        ]
  check "actual source has the independently stated 14-operation sequence" (operations == expected)
  check "actual source validates, including its forward branch" (validateProgram program == Right ())
  check "declarations and labels do not become operations" (length items == 23)
  check "each source range reconstructs the exact original item" (all (rangeMatches source) items)
  check "source-file identity is retained" (all ((== "specimen.english") . sourceName . startPosition . sourceRange) items)
  check "first source item starts on line one" (unPos (sourceLine (startPosition (sourceRange (head items)))) == 1)

  annotated <- parseSuccessfully (comments <> source)
  check "annotation text cannot introduce undeclared executable operands"
    (validateProgram annotated == Right ())
  check "notes and explanations have distinct types"
    (case map sourceItem (take 2 (programItems annotated)) of
      [NonexecutingComment OrdinaryNote _, NonexecutingComment Explanation _] -> True
      _ -> False)
  check "nested note parentheses are retained"
    (case sourceItem (head (programItems annotated)) of
      NonexecutingComment _ body -> "(nested (text))" `Text.isInfixOf` body
      _ -> False)
  check "annotation source includes both delimiters"
    (Text.isPrefixOf "(NOTE:" (originalSource (head (programItems annotated)))
      && Text.isSuffixOf ")" (originalSource (head (programItems annotated))))

  let unicodeSource = Text.replace "running total" "résultat 🪵." source
  unicodeProgram <- parseSuccessfully unicodeSource
  check "Unicode descriptive names validate" (validateProgram unicodeProgram == Right ())
  check "Unicode character offsets reconstruct original items"
    (all (rangeMatches unicodeSource) (programItems unicodeProgram))
  crlfProgram <- parseSuccessfully (Text.replace "\n" "\r\n" source)
  check "CRLF input keeps the same operation values"
    ([operation | Located _ _ (ExecutableOperation operation) <- programItems crlfProgram] == expected)
  spacedProgram <- parseSuccessfully (Text.replace "Put zero into" "Put\n\tzero   into" source)
  check "word spacing and sentence line wrapping preserve operations"
    ([operation | Located _ _ (ExecutableOperation operation) <- programItems spacedProgram] == expected)
  adjacentProgram <- parseSuccessfully (Text.replace ".\n" "." source)
  check "sentences need not occupy separate lines" (validateProgram adjacentProgram == Right ())

  let header = "This program uses ARMv7-A Thumb instructions.\n"
      returnSentence = "Replace the execution index with the instruction address in the link register.\n"
      exactNames = header
        <> "Name the following instruction \"A-B\".\n"
        <> "Name the following instruction \"A B\".\n"
        <> "Replace the execution index with the instruction named \"A-B\".\n"
        <> returnSentence
  exactProgram <- parseSuccessfully exactNames
  check "distinct names that would collide under slugification stay distinct"
    (validateProgram exactProgram == Right ())
  expectInvalid "instruction names remain case-sensitive" "No instruction"
    (Text.replace "named \"A-B\"" "named \"a-b\"" exactNames)

  expectSyntaxFailure "unknown instruction cannot be swallowed" (source <> "Jump somewhere.\n")
  expectSyntaxFailure "multiply is not silently invented"
    (Text.replace "Add \"current entry\"" "Multiply \"current entry\"" source)
  expectSyntaxFailure "unsupported physical-register spelling"
    (Text.replace "register twelve" "register thirteen" source)
  expectSyntaxFailure "missing terminal period" (Text.dropEnd 2 source)
  expectSyntaxFailure "unterminated quoted name" (header <> "Name register zero \"unfinished.")
  expectSyntaxFailure "empty quoted name" (header <> "Name register zero \"\".")
  expectSyntaxFailure "whitespace-only quoted name" (header <> "Name register zero \"   \".")
  expectSyntaxFailure "quoted names cannot span lines" (header <> "Name register zero \"first\nsecond\".")
  expectSyntaxFailure "unterminated annotation" (source <> "(NOTE: missing close")
  expectSyntaxFailure "unterminated nested annotation" (source <> "(NOTE: (inner)")
  expectSyntaxFailure "unrecognized annotation tag" (source <> "(OTHER: hidden text)")
  expectSyntaxFailure "trailing punctuation is not ignored" (source <> ")")
  expectSyntaxFailure "keyword prefix is not a complete keyword"
    (Text.replace "Put zero into" "Putzero into" source)
  expectSyntaxFailure "wrong flag-effect wording is not a comment"
    (Text.replace "without changing the condition flags" "while changing the condition flags" source)

  expectInvalid "undeclared register" "No machine register"
    (Text.replace "into \"running total\"" "into \"missing register\"" source)
  expectInvalid "missing branch destination" "No instruction"
    (Text.replace "named \"return the result\"" "named \"missing instruction\"" source)
  expectInvalid "duplicate machine declaration" "exactly once" (header <> source)
  expectInvalid "missing machine declaration" "Declare the machine" (Text.drop (Text.length header) source)
  expectInvalid "duplicate register name" "descriptive register name"
    (Text.replace "one \"number of entries remaining\"" "one \"running total\"" source)
  expectInvalid "duplicate physical register" "physical register"
    (Text.replace "register one" "register zero" source)
  expectInvalid "duplicate instruction name" "instruction name has already"
    (Text.replace "following instruction \"return the result\""
      "following instruction \"prepare the total\"" source)
  expectInvalid "late register declaration" "Name registers before"
    (source <> "Name register zero \"late\".\n")
  expectInvalid "dangling instruction name" "followed by an executable"
    (source <> "Name the following instruction \"nothing follows\".\n")
  expectInvalid "empty source is not a program" "Declare the machine" ""
  expectInvalid "comments alone are not a program" "Declare the machine" comments
  expectInvalid "machine without operations is not a program" "At least one executable" header
  putStrLn "All parser and validation assertions passed."

rangeMatches :: Text -> Located SourceItem -> Bool
rangeMatches source item = originalSource item == Text.take
  (endCharacterOffset location - startCharacterOffset location)
  (Text.drop (startCharacterOffset location) source)
  where location = sourceRange item

parseSuccessfully :: Text -> IO Program
parseSuccessfully source = case parseProgram "specimen.english" source of
  Left problem -> putStrLn (errorBundlePretty problem) >> exitFailure
  Right program -> pure program

check :: String -> Bool -> IO ()
check description condition = do
  unless condition (putStrLn ("FAIL: " <> description) >> exitFailure)
  putStrLn ("PASS: " <> description)

expectSyntaxFailure :: String -> Text -> IO ()
expectSyntaxFailure description source = check description (isLeft (parseProgram "negative.english" source))

expectInvalid :: String -> Text -> Text -> IO ()
expectInvalid description expectedMessage source = do
  program <- parseSuccessfully source
  case validateProgram program of
    Right () -> check description False
    Left problem -> check description (expectedMessage `Text.isInfixOf` validationMessage problem)
