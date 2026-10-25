      subroutine dqrls(x,n,p,y,ny,tol,b,rsd,qty,k,jpvt,qraux,work)
      integer n,p,ny,k,jpvt(p)
      double precision x(n,p),y(n,ny),tol,b(p,ny),rsd(n,ny),
     .                 qty(n,ny),qraux(p),work(2*p)
      integer info,i,j,jj,kk
      call dqrdc2(x,n,n,p,tol,k,qraux,jpvt,work)
      if(k .gt. 0) then
         do 20 jj=1,ny
            call dqrsl(x,n,n,k,qraux,y(1,jj),rsd(1,jj),qty(1,jj),
     1           b(1,jj),rsd(1,jj),rsd(1,jj),1110,info)
   20       continue
      else
         do 35 i=1,n
            do 30 jj=1,ny
                rsd(i,jj) = y(i,jj)
   30       continue
   35   continue
      endif
      kk = k + 1
      do 50 j=kk,p
         do 40 jj=1,ny
            b(j,jj) = 0.d0
   40    continue
   50 continue
      return
      end
