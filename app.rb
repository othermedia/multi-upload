require 'rubygems'
require 'sinatra'

get '/' do
  File.read('views/index.html')
end

post '/create' do
  'Success!'
end

post '/file' do
  params['Filedata'] ? 'New file!' : 'Nothing.'
end

