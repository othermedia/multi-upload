PROJECT_DIR = File.expand_path(File.dirname(__FILE__))
require 'helium/jake'

jake_hook :build_complete do
  FileUtils.rm_rf 'test/public/lib' if File.exists? 'test/public/lib'
  FileUtils.mv 'test/lib', 'test/public/lib'
  
  FileUtils.rm 'test/public/packages.js' if File.exists? 'test/public/packages.js'
  FileUtils.mv 'test/packages.js', 'test/public/packages.js'
end

