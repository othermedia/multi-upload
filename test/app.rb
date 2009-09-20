require 'rubygems'
require 'sinatra'

ROOT = File.expand_path(File.dirname(__FILE__))
set :public, File.join(ROOT, 'public')
set :views, File.join(ROOT, 'views')

get '/' do
  File.read(File.join(ROOT, 'views', 'index.html'))
end

post '/create' do
  'Success!'
end

post '/file' do
  puts params.inspect
  params['Filedata'] ? 'New file!' : 'Nothing.'
end

