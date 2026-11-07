{-# LANGUAGE OverloadedStrings #-}

module Main (main) where

import qualified Data.Text.IO as Text
import EnglishMajorC.Parser (parseProgram)
import EnglishMajorC.Syntax
import EnglishMajorC.Validation
import System.Environment (getArgs)
import System.Exit (exitFailure)
import System.IO (hPutStrLn, stderr)
import Text.Megaparsec (errorBundlePretty, sourcePosPretty)

main :: IO ()
main = do
  arguments <- getArgs
  case arguments of
    [sourcePath] -> do
      source <- Text.readFile sourcePath
      case parseProgram sourcePath source of
        Left problem -> hPutStrLn stderr (errorBundlePretty problem) >> exitFailure
        Right program -> case validateProgram program of
          Left problem -> do
            let position = maybe sourcePath (sourcePosPretty . startPosition)
                  (validationLocation problem)
            hPutStrLn stderr (position <> ": invalid program")
            Text.hPutStrLn stderr (validationMessage problem)
            exitFailure
          Right () -> mapM_ print (programItems program)
    _ -> hPutStrLn stderr "Usage: parse-english-major-c SOURCE.english" >> exitFailure
